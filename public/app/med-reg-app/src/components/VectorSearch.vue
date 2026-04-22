<template>
  <div class="vector-search">
    <div class="scan-header">
      <h3>🎯 逐条发现高风险关联项</h3>
      <span class="badge warning" v-if="searchResults.length > 0">需复核 ({{ searchResults.length }})</span>
    </div>

    <div v-if="!isModelReady" class="empty-hint searching">
      <span class="spinner">🔄</span> 正在载入本地语义内核...
    </div>

    <div v-else-if="appStore.triggerSearchSignal === 0" class="empty-hint">
      等待新规推演完成以启动逐条检索...
    </div>

    <div v-else-if="isSearching" class="empty-hint searching advanced-scanning">
      <div class="scan-icon">⚡</div>
      <p class="scan-title">正在执行 1v1 精确向量路由比对...</p>
      
      <div class="mini-progress-box">
        <div class="mini-track">
          <div class="mini-fill" :style="{ width: (searchProgress.current / searchProgress.total * 100) + '%' }"></div>
        </div>
        <div class="progress-stats">
          <span>正在分析第 {{ searchProgress.current }} 项变更</span>
          <span>共 {{ searchProgress.total }} 项</span>
        </div>
      </div>
      
      <p class="current-task">"{{ currentSearchText }}"</p>
    </div>

    <div v-else class="results-list">
      <div 
        v-for="(result, index) in searchResults" 
        :key="index" 
        class="match-card" 
        :class="{ active: index === 0 }"
      >
        <div class="card-header">
          <span class="match-score" :class="{ low: result.score < 80 }">匹配度 {{ result.score }}%</span>
          <h4>📄 {{ result.fileName }}</h4>
        </div>
        
        <div class="card-body">
          <div class="matched-rule">
            <span class="rule-label">🎯 对应新规变更：</span>
            {{ result.ruleSnippet }}
          </div>
          <div class="matched-chunk">
            <span class="chunk-label">📑 锁定本地条款：</span>
            "...{{ result.snippet }}..."
          </div>
        </div>
        
        <div class="card-footer">
          <button class="analyze-btn" :class="{ outline: index !== 0 }" @click="startDeepAnalysis(result)">
            ⚡ 针对该对应关系启动 AI 深度修改
          </button>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref, watch, onMounted } from 'vue'
import { appStore } from '../store.js'
import { pipeline, env } from '@xenova/transformers'

const isSearching = ref(false)
const isModelReady = ref(false)
const searchResults = ref([])
const searchProgress = ref({ current: 0, total: 0 })
const currentSearchText = ref('')

// 全局单例模型实例
let extractor = null

// ==========================================
// 【终极黑客科技】：动态装载模型引擎
// ==========================================
const getExtractor = async () => {
  if (extractor) return extractor;

  console.log("正在初始化语义内核...");

  // 模式 A：用户在设置中【手工指定】了外部的电脑文件夹
  if (appStore.customModelFiles && appStore.customModelFiles.length > 0) {
    console.log("🚀 拦截模式启动：正在从您指定的外部硬盘文件夹加载模型！");
    
    env.allowLocalModels = false;
    env.allowRemoteModels = true; // 骗底层去发起网络请求
    env.remoteHost = 'https://local-model-mock'; // 虚拟一个假域名
    
    // 拦截底层的网络请求函数
    const originalFetch = env.fetch || fetch;
    env.fetch = async (url, init) => {
      const fileName = url.toString().split('/').pop();
      // 在用户选中的文件夹中寻找对应的文件 (如 config.json, model_quantized.onnx)
      const fileObj = appStore.customModelFiles.find(f => f.name === fileName);
      
      if (fileObj) {
        console.log(`[精准拦截] 成功向引擎喂入本地文件: ${fileName}`);
        let mimeType = fileName.endsWith('.json') ? 'application/json' : 'application/octet-stream';
        return new Response(fileObj, { headers: { 'content-type': mimeType } });
      }
      return originalFetch(url, init);
    };

    // 启动管道，让它去虚拟域名下拿数据（实际上会被我们拦截并替换为本地文件）
    extractor = await pipeline('feature-extraction', 'custom_model_dir', { quantized: true });
  } 
  // 模式 B：用户没指定，走默认的内置加载（适合已经把模型放进 public 的情况）
  else {
    console.log("⚙️ 默认模式启动：从项目内置 public 目录加载");
    env.allowLocalModels = true;
    env.allowRemoteModels = false;
    env.localModelPath = import.meta.env.BASE_URL || './';
    extractor = await pipeline('feature-extraction', 'models/bge-small-zh-v1.5', { quantized: true });
  }

  isModelReady.value = true;
  return extractor;
}

// ==========================================
// 辅助算法与解析逻辑 (保持不变)
// ==========================================
const calculateCosineSimilarity = (vecA, vecB) => {
  let dotProduct = 0, normA = 0, normB = 0
  const len = Math.min(vecA.length, vecB.length)
  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i]; normA += vecA[i] * vecA[i]; normB += vecB[i] * vecB[i];
  }
  return normA === 0 || normB === 0 ? 0 : dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

const parseSummaryToPoints = (text) => {
  let items = [];
  if (/^\d+\./m.test(text)) items = text.split(/(?=\n\d+\.)|(?=^\d+\.)/).filter(i => i.trim());
  else items = text.split(/(?=\*\*新增\*\*|(?=\*\*修订\*\*)|(?=\*\*删除\*\*))/).filter(i => i.trim());
  
  return items.map(item => {
    const fileMatch = item.match(/【受影响文件】[：:](.*?)(?=\n|$)/);
    let files = fileMatch ? fileMatch[1].split(/[,、，]/).map(f => f.replace(/[《》<> ]/g, '').trim()).filter(f => f) : [];
    let cleanText = item.replace(/【受影响文件】.*/g, '').replace(/^\d+\.\s*/, '').trim();
    return { text: cleanText, files: files };
  });
}

// ==========================================
// 监听搜索触发
// ==========================================
watch(() => appStore.triggerSearchSignal, async () => {
  if (!window.localVectorDB || !appStore.aiSummary) return;

  isSearching.value = true;
  searchResults.value = [];
  
  try {
    // 延迟获取模型引擎：只有在点击搜索时才实例化，确保能读取到用户最新配置的文件夹
    const currentExtractor = await getExtractor();
    
    const points = parseSummaryToPoints(appStore.aiSummary);
    searchProgress.value = { current: 0, total: points.length };
    const allMatches = [];

    // 逐条处理与路由搜索
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      searchProgress.value.current = i + 1;
      if (point.text.length < 10) continue; 
      
      currentSearchText.value = point.text.substring(0, 40).replace(/\*\*/g, '') + '...';
      
      const output = await currentExtractor(point.text, { pooling: 'mean', normalize: true })
      const queryVector = Array.from(output.data)

      let candidates = window.localVectorDB;
      if (point.files.length > 0) {
        const exactMatches = window.localVectorDB.filter(item => 
          point.files.some(f => item.source.includes(f) || f.includes(item.source.replace(/\.[^/.]+$/, "")))
        );
        if (exactMatches.length > 0) candidates = exactMatches;
      }

      const ranked = candidates.map(item => {
        return {
          fileName: item.source, fullText: item.text,
          snippet: item.text.substring(0, 150).replace(/\n/g, ' ') + '...',
          score: Math.round(calculateCosineSimilarity(queryVector, item.vector) * 100),
          ruleSnippet: point.text.substring(0, 80).replace(/\*\*/g, '') + '...' 
        }
      }).sort((a, b) => b.score - a.score)

      if (ranked.length > 0 && ranked[0].score >= 35) allMatches.push(ranked[0]);
    }

    allMatches.sort((a, b) => b.score - a.score);
    searchResults.value = allMatches;

  } catch (error) {
    console.error('逐条向量搜索异常:', error);
    alert('搜索异常，请检查控制台。');
  } finally {
    isSearching.value = false;
  }
})

const startDeepAnalysis = (result) => {
  appStore.targetSopFileName = result.fileName;
  appStore.targetSopChunk = result.fullText;
  appStore.triggerAnalysisSignal++; 
}
</script>


<style scoped>
/* ========== 核心修复：防挤压布局 ========== */
.vector-search { 
  display: flex; 
  flex-direction: column; 
  gap: 12px; 
  height: 100%; 
  overflow: hidden; /* 防止最外层滚动，把滚动权交给 results-list */
}

.results-list { 
  display: flex; 
  flex-direction: column; 
  gap: 16px; 
  overflow-y: auto; 
  flex: 1; /* 撑满剩余空间 */
  padding: 4px 4px 20px 4px; /* 留出底部和阴影空间 */
}

.match-card { 
  flex-shrink: 0; /* 【救命代码】：绝对禁止被 Flexbox 挤压高度！ */
  border: 1px solid #e2e8f0; 
  border-radius: 10px; 
  overflow: hidden; 
  background: white; 
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
}
/* ========================================= */

.scan-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
.scan-header h3 { margin: 0; font-size: 14px; color: #0f172a; }
.badge.warning { background: #fef08a; color: #854d0e; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }

.empty-hint { padding: 20px; text-align: center; font-size: 13px; color: #94a3b8; border: 1px dashed #cbd5e1; border-radius: 8px; background: #f8fafc;}
.empty-hint.searching { color: #3b82f6; border-color: #93c5fd; background: #eff6ff;}

.advanced-scanning { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 30px 20px; }
.scan-icon { font-size: 32px; animation: pulse 1s infinite; }
.scan-title { margin: 0; font-weight: bold; color: #1e3a8a; }
.mini-progress-box { width: 100%; max-width: 300px; margin-top: 10px; }
.mini-track { height: 6px; background: #bfdbfe; border-radius: 3px; overflow: hidden; margin-bottom: 6px; }
.mini-fill { height: 100%; background: #2563eb; transition: width 0.2s ease; }
.progress-stats { display: flex; justify-content: space-between; font-size: 11px; color: #3b82f6; font-weight: 600; }
.current-task { font-size: 12px; color: #64748b; font-style: italic; background: white; padding: 4px 12px; border-radius: 12px; border: 1px solid #bfdbfe; max-width: 90%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}
@keyframes pulse { 50% { transform: scale(1.1); opacity: 0.8; } }

.match-card.active { border-color: #3b82f6; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6;}

.card-header { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; }
.match-score { font-size: 12px; font-weight: bold; color: white; background: #10b981; padding: 2px 6px; border-radius: 4px; }
.match-score.low { background: #f59e0b; }
.card-header h4 { margin: 0; font-size: 14px; color: #1e293b; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;}

.card-body { padding: 16px 14px; display: flex; flex-direction: column; gap: 12px; }

.matched-rule { background: #fffbeb; border: 1px solid #fef08a; padding: 10px 12px; border-radius: 6px; font-size: 13px; color: #92400e; line-height: 1.5; }
.rule-label { font-weight: bold; color: #b45309; margin-bottom: 4px; display: block;}

.matched-chunk { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 12px; border-radius: 6px; font-size: 12px; color: #475569; line-height: 1.6; font-style: italic;}
.chunk-label { font-weight: bold; color: #64748b; margin-bottom: 4px; display: block; font-style: normal; }

.card-footer { padding: 12px 14px; border-top: 1px solid #f1f5f9; background: #ffffff;}
.analyze-btn { width: 100%; padding: 12px; background: #eff6ff; color: #2563eb; border: 1px dashed #93c5fd; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s; display: flex; justify-content: center; align-items: center; gap: 6px;}
.analyze-btn:hover { background: #dbeafe; border-style: solid; transform: translateY(-1px);}
.analyze-btn.outline { background: white; border: 1px solid #cbd5e1; color: #64748b; }
.analyze-btn.outline:hover { background: #f8fafc; border-color: #94a3b8; color: #0f172a;}
</style>
