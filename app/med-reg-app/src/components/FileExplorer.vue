<template>
  <div class="file-explorer">
    <div class="auth-zone" :class="{ 'is-busy': isBuildingIndex }">
      <div class="icon-large">📦</div>
      <div class="text">
        <h4>导入 SOP 语义分片库</h4>
        <p>选择 Python 导出的 <strong>sop_shards</strong> 文件夹 (包含索引与分片)</p>
      </div>
      <input 
        type="file" 
        ref="jsonInput" 
        class="hidden-input" 
        webkitdirectory 
        directory 
        @change="importPrecomputedDirectory" 
      />
      <button 
        class="outline-btn" 
        @click="triggerFileInput" 
        :disabled="isBuildingIndex || isCompleted"
      >
        {{ isCompleted ? '✅ 语义库已就绪' : '选择导出的文件夹' }}
      </button>
    </div>

    <div v-if="isBuildingIndex || logs.length > 0" class="vector-dashboard">
      <div class="dashboard-header">
        <span class="blinking-dot"></span>
        <strong>离线语义库加载引擎</strong>
        <span class="progress-percent">{{ overallProgress }}%</span>
      </div>
      
      <div class="main-progress">
        <div class="progress-fill" :style="{ width: overallProgress + '%' }"></div>
      </div>

      <div class="terminal-log" ref="logContainer">
        <div v-for="(log, index) in logs" :key="index" class="log-line">
          <span class="time">[{{ log.time }}]</span>
          <span class="msg" :class="log.type">{{ log.text }}</span>
        </div>
        <div class="log-line typing" v-if="isBuildingIndex">_</div>
      </div>
    </div>

    <div v-if="isCompleted || (!isBuildingIndex && scannedFiles.length > 0)" class="file-list-container">
      <div class="list-header">
        <span>受控体系文件 (已加载 {{ scannedFiles.length }} 份)</span>
        <span class="badge success">本地向量空间已激活</span>
      </div>
      
      <div class="list-body">
        <div class="file-item" v-for="file in scannedFiles" :key="file.name">
          <span class="file-icon" :class="file.type">{{ file.type === 'pdf' ? '📄' : '📝' }}</span>
          <div class="file-info">
            <span class="file-name">{{ file.name }}</span>
            <span class="file-meta">状态: 内存挂载 | 包含 <strong>{{ file.chunks }}</strong> 个语义向量块</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { appStore } from '../store.js'

const isBuildingIndex = ref(false)
const isCompleted = ref(false)
const overallProgress = ref(0)
const logs = ref([])
const scannedFiles = ref([])
const logContainer = ref(null)
const jsonInput = ref(null)

const triggerFileInput = () => {
  if (jsonInput.value) jsonInput.value.click()
}

const addLog = (text, type = 'info') => {
  const now = new Date()
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  logs.value.push({ time: timeStr, text, type })
  nextTick(() => {
    if (logContainer.value) logContainer.value.scrollTop = logContainer.value.scrollHeight
  })
}

// ==========================================
// 核心逻辑：读取并还原 Python 导出的多文件分片结构
// ==========================================
const importPrecomputedDirectory = async (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  try {
    isBuildingIndex.value = true;
    isCompleted.value = false;
    logs.value = [];
    overallProgress.value = 0;
    scannedFiles.value = [];

    // 1. 定位 index_map.json
    const filesArray = Array.from(files);
    const indexFile = filesArray.find(f => f.name.endsWith('index_map.json'));
    
    if (!indexFile) {
      addLog('❌ 错误：在文件夹中未找到 index_map.json，请确认选择的是 Python 输出目录。', 'error');
      isBuildingIndex.value = false;
      return;
    }

    addLog('已识别索引表，开始初始化本地向量空间...', 'info');
    const indexContent = JSON.parse(await indexFile.text());
    
    // 初始化或清空全局向量数据库
    window.localVectorDB = [];
    let totalChunks = 0;

    // 2. 遍历索引并加载对应的 JSON 分片
    for (let i = 0; i < indexContent.length; i++) {
      const entry = indexContent[i];
      const shardFile = filesArray.find(f => f.name.endsWith(entry.shard_file));
      
      if (shardFile) {
        addLog(`正在装载分片: ${entry.shard_file}...`, 'info');
        const shardData = JSON.parse(await shardFile.text());
        
        // 注入到内存
        window.localVectorDB.push(...shardData);
        totalChunks += shardData.length;

        scannedFiles.value.push({
          name: entry.file_name,
          type: entry.file_name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'word',
          chunks: entry.chunk_count
        });
      }
      overallProgress.value = Math.floor(((i + 1) / indexContent.length) * 100);
    }

    addLog(`🎉 挂载成功！已在内存中激活 ${totalChunks} 个语义锚点。`, 'success');
    appStore.availableFiles = scannedFiles.value;
    isCompleted.value = true;
  } catch (err) {
    addLog(`❌ 导入异常: ${err.message}`, 'error');
  } finally {
    isBuildingIndex.value = false;
    event.target.value = '';
  }
}
</script>

<style scoped>
/* 样式部分保持你原来的设计即可，已在之前代码中提供 */
.file-explorer { display: flex; flex-direction: column; gap: 20px; }
.auth-zone { display: flex; align-items: center; gap: 16px; padding: 16px; border: 2px dashed #cbd5e1; border-radius: 12px; background-color: #f8fafc; transition: all 0.3s;}
.auth-zone.is-busy { border-color: #93c5fd; background-color: #eff6ff; opacity: 0.6; pointer-events: none;}
.icon-large { font-size: 32px; }
.text h4 { margin: 0 0 4px 0; font-size: 14px; color: #1e293b; }
.text p { margin: 0; font-size: 11px; color: #64748b; }
.hidden-input { display: none; }
.outline-btn { margin-left: auto; padding: 10px 18px; background: white; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; color: #334155; transition: all 0.2s; }
.vector-dashboard { background: #0f172a; border-radius: 12px; padding: 20px; color: #f8fafc; }
.dashboard-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; font-size: 14px; }
.blinking-dot { width: 8px; height: 8px; background-color: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; animation: blink 1s infinite; }
@keyframes blink { 50% { opacity: 0.3; } }
.progress-percent { margin-left: auto; font-weight: bold; color: #38bdf8; font-family: monospace; font-size: 16px;}
.main-progress { height: 6px; background: #334155; border-radius: 3px; overflow: hidden; margin-bottom: 20px; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #0ea5e9, #10b981); transition: width 0.3s ease; }
.terminal-log { background: #020617; border-radius: 8px; padding: 12px; height: 120px; overflow-y: auto; font-family: monospace; font-size: 11px; line-height: 1.6; border: 1px solid #334155;}
.log-line { display: flex; gap: 8px; margin-bottom: 4px;}
.log-line .time { color: #475569; }
.log-line .msg.success { color: #10b981; }
.log-line .msg.warn { color: #f59e0b; }
.log-line .msg.error { color: #ef4444; }
.file-list-container { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
.list-header { background: #f8fafc; padding: 12px 16px; font-size: 13px; font-weight: 600; display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0;}
.badge.success { background: #dcfce7; color: #166534; font-size: 11px; padding: 2px 8px; border-radius: 12px;}
.list-body { max-height: 280px; overflow-y: auto; }
.file-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #f1f5f9; }
.file-icon { font-size: 20px; }
.file-info { display: flex; flex-direction: column; gap: 4px; overflow: hidden; }
.file-name { font-size: 13px; color: #334155; font-weight: 500; }
.file-meta { font-size: 11px; color: #94a3b8; }
.file-meta strong { color: #3b82f6; }
</style>