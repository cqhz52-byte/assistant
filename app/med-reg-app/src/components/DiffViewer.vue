<template>
  <div class="diff-viewer">
    <div class="strategy-selector">
      <div class="strategy-option" :class="{ active: compareMode === 'single' }" @click="compareMode = 'single'">
        <span class="icon">🧠</span>
        <div class="opt-text">
          <strong>AI 知识库推演 (单文件)</strong>
          <span>基于 AI 记忆识别新规变更</span>
        </div>
      </div>
      <div class="strategy-option" :class="{ active: compareMode === 'dual' }" @click="compareMode = 'dual'">
        <span class="icon">⚖️</span>
        <div class="opt-text">
          <strong>精准双文档比对 (新旧版)</strong>
          <span>严格基于两份文本的差异提取</span>
        </div>
      </div>
    </div>

    <div class="upload-container">
      <div v-if="compareMode === 'dual'" class="upload-box" @click="triggerOldFileInput">
        <span class="box-icon">{{ oldFile ? '✅' : '📁' }}</span>
        <div class="box-text">
          <strong>{{ oldFile ? oldFile.name : '导入【旧版】法规' }}</strong>
          <span>{{ oldFile ? '已就绪' : '作为比对基线 (PDF/Word)' }}</span>
        </div>
        <input type="file" ref="oldFileInput" class="hidden-input" accept=".pdf,.docx" @change="(e) => handleFileSelect(e, 'old')" />
      </div>

      <div class="upload-box" :class="{ 'highlight': compareMode === 'single' }" @click="triggerNewFileInput">
        <span class="box-icon">{{ newFile ? '✅' : '📄' }}</span>
        <div class="box-text">
          <strong>{{ newFile ? newFile.name : '导入【新版】法规' }}</strong>
          <span>{{ newFile ? '已就绪' : '最新草案或正式版 (PDF/Word)' }}</span>
        </div>
        <input type="file" ref="newFileInput" class="hidden-input" accept=".pdf,.docx" @change="(e) => handleFileSelect(e, 'new')" />
      </div>
    </div>

    <button class="start-analysis-btn" :disabled="!canStartAnalysis || isExtracting" @click="startAnalysis">
      <span v-if="!isExtracting">🚀 启动 AI 深度解析</span>
      <span v-else class="spinner">🔄 正在全功率解析文档...</span>
    </button>

    <div v-if="isExtracting" class="progress-container">
      <div class="progress-track"><div class="progress-fill" :style="{ width: progressWidth + '%' }"></div></div>
      <div class="step-labels">
        <span :class="{ 'active': currentStep >= 0 }">提取文本</span>
        <span :class="{ 'active': currentStep >= 1 }">AI 比对中</span>
        <span :class="{ 'active': currentStep >= 2 }">生成报告</span>
      </div>
    </div>

    <div v-if="errorMessage" class="error-alert">
      <div class="error-header"><span>❌ 解析中断</span><button @click="errorMessage = ''" class="close-error">✕</button></div>
      <p class="error-msg">{{ errorMessage }}</p>
    </div>

    <div v-if="isAiGenerated" class="success-panel">
      <div class="success-icon">✅</div>
      <h4>法规推演已完成</h4>
      <p>已基于 [{{ compareMode === 'single' ? 'AI 知识库' : '双文档比对' }}] 提炼核心变更</p>
      <button class="outline-btn" @click="openModal">🔍 重新全屏查看报告</button>
    </div>

    <div v-if="showSummaryModal" class="modal-overlay" @click.self="showSummaryModal = false">
      <div class="modal-content" :class="{ 'is-maximized': isMaximized }">
        <div class="modal-header">
          <div class="header-titles">
            <h3>📑 新规核心变更与 SOP 影响评估报告</h3>
            <span class="sub-title">当前模式：{{ compareMode === 'single' ? '🧠 AI 知识库单文档推演' : '⚖️ 严谨双文档精准比对' }}</span>
          </div>
          <div class="header-actions">
            <button class="icon-btn" @click="isMaximized = !isMaximized">
              {{ isMaximized ? '🗗 退出全屏' : '🗖 全屏最大化' }}
            </button>
            <button class="icon-btn close-btn" @click="showSummaryModal = false">✕</button>
          </div>
        </div>

        <div class="modal-body custom-markdown">
          <div v-if="isExtracting && !regContent" class="advanced-loader">
            <div class="loader-core">
              <div class="circle outer"></div>
              <div class="circle inner"></div>
              <div class="icon">🧠</div>
            </div>
            <div class="loader-text">
              <h4>正在激活大语言模型进行深度推演</h4>
              <p>法规文本极为严谨，深度比对预计需要 10~30 秒，请耐心等待...</p>
              <div class="loading-bar"><div class="bar-fill"></div></div>
            </div>
          </div>
          
          <div v-else v-html="formatMarkdown(regContent)"></div>
        </div>

        <div class="modal-footer">
          <button class="secondary-btn" @click="showSummaryModal = false">暂不处理</button>
          <button class="primary-btn" @click="startSemanticSearchAndClose">
            <span class="icon">🚀</span> 确认变更点，去匹配本地 SOP
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMultimodal } from '../hooks/useMultimodal.js'
import { appStore } from '../store.js'
import { loadApiConfig } from '../services/apiConfig.js'

import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const { analyzeWithAI } = useMultimodal()

const compareMode = ref('single') 
const oldFileInput = ref(null)
const newFileInput = ref(null)
const oldFile = ref(null)
const newFile = ref(null)

const isExtracting = ref(false)
const isAiGenerated = ref(false)
const regContent = ref('')
const errorMessage = ref('')
const currentStep = ref(-1)

const showSummaryModal = ref(false)
const isMaximized = ref(false)

const triggerOldFileInput = () => oldFileInput.value.click()
const triggerNewFileInput = () => newFileInput.value.click()

const openModal = () => {
  showSummaryModal.value = true
}

const handleFileSelect = (event, type) => {
  const file = event.target.files[0]
  if (!file) return
  if (type === 'old') oldFile.value = file
  else newFile.value = file
}

const canStartAnalysis = computed(() => {
  if (compareMode.value === 'single') return !!newFile.value
  return !!oldFile.value && !!newFile.value
})

const progressWidth = computed(() => {
  if (currentStep.value === -1) return 0
  return ((currentStep.value + 1) / 3) * 100
})

const extractTextFromFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const arrayBuffer = e.target.result
      try {
        if (file.name.toLowerCase().endsWith('.pdf')) {
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
          let fullText = ''
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const textContent = await page.getTextContent()
            fullText += textContent.items.map(item => item.str).join(' ') + '\n'
          }
          resolve(fullText)
        } else if (file.name.toLowerCase().endsWith('.docx')) {
          const result = await mammoth.extractRawText({ arrayBuffer })
          resolve(result.value)
        } else {
          reject(new Error("仅支持 .pdf 或 .docx"))
        }
      } catch (err) { reject(new Error(`文档解析失败: ${err.message}`)) }
    }
    reader.onerror = () => reject(new Error("读取失败"))
    reader.readAsArrayBuffer(file)
  })
}

const startAnalysis = async () => {
  const config = loadApiConfig()
  if (!config || !config.apiKey) {
    errorMessage.value = "请先配置 API 密钥。"
    return
  }

  errorMessage.value = ''
  isExtracting.value = true
  isAiGenerated.value = false
  regContent.value = ''
  currentStep.value = 0 
  showSummaryModal.value = true
  isMaximized.value = false 
  
  // 提前获取本地文件名集合，以便在 prompt 阶段注入
  const localFileNames = appStore.availableFiles.map(f => f.name).join('、');

  try {
    let systemPrompt = ""
    let userPrompt = ""

    const promptConstraint = `
执行要求（必须严格遵守）：
1. 【抓大放小】：过滤掉无关紧要的格式修改、字词微调，仅提取【最核心的实质性变更】。将相似条款合并，总条目数建议控制在 15-20 条以内，杜绝凑数和幻觉。
2. 必须分条列出，每条以数字序号开头（如 1. 2. 3.）。
3. 【高亮约束】：每条正文开头必须明确使用 **新增**、**修订**、**强制** 或 **删除**，且必须加粗！每条内该词只允许在开头出现一次，句中不可重复。
4. 【精准推演】：在每条结尾，推演企业必须修改的【内部体系文件 (SOP)】。
   - 参考本地现有文件：[${localFileNames}]
   - 如果涉及本地已有文件，请务必直接使用本地文件名。如果缺失，可根据经验建议。
   ⚠️ 格式：必须严格新起一行输出：“【受影响文件】：SOP文件名A, SOP文件名B”。`

    if (compareMode.value === 'single') {
      const textNew = await extractTextFromFile(newFile.value)
      systemPrompt = `你是一个资深的医疗器械法规审查专家。任务：基于你庞大的医疗器械质量管理体系知识库（如GMP/ISO13485），对比用户上传的【新版法规】内容，挑出核心变更点。` + promptConstraint
      userPrompt = `【新版法规提取文本】：\n${textNew.substring(0, 30000)}`
    } else {
      const textOld = await extractTextFromFile(oldFile.value)
      const textNew = await extractTextFromFile(newFile.value)
      systemPrompt = `你是一个极度严谨的法规审查 QA 专家。任务：基于提供的【旧版】和【新版】原文进行纯文本 Diff 比对，挑出核心的实质性变更。` + promptConstraint
      userPrompt = `【旧版法规原文】：\n${textOld.substring(0, 18000)}\n\n================\n\n【新版法规原文】：\n${textNew.substring(0, 18000)}`
    }

    currentStep.value = 1 

    await analyzeWithAI({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      systemPrompt: systemPrompt,
      userText: userPrompt,
      onChunk: (text) => {
        if (currentStep.value === 1) currentStep.value = 2
        regContent.value += text
      }
    })
    
    isExtracting.value = false
    isAiGenerated.value = true
    currentStep.value = -1
    appStore.aiSummary = regContent.value
  } catch (error) {
    isExtracting.value = false
    currentStep.value = -1
    showSummaryModal.value = false
    errorMessage.value = error.message 
  }
}

const formatMarkdown = (text) => {
  if (!text) return ''; // 返回空，让外层渲染 advanced-loader
  
  // 提取全局共享内存中的实际文件列表
  const realFileNames = appStore.availableFiles.map(f => f.name);
  
  let html = text.replace(/(?:^|\n)(\d+)\.\s+([\s\S]*?)(?=\n\d+\.\s+|$)/g, (match, num, content) => {
    let cardText = content.trim();

    const startRegex = /^(?:\*\*)?(新增|增加|修订|修改|更新|变更|强制|必须|严禁|应当|删除|废止|取消)(?:\*\*)?\s*([:：])?\s*/;

    cardText = cardText.replace(startRegex, (m, keyword, colon) => {
      let colorClass = 'hl-default';
      if (/新增|增加/.test(keyword)) colorClass = 'hl-add';
      else if (/修订|修改|更新|变更/.test(keyword)) colorClass = 'hl-edit';
      else if (/强制|必须|严禁|应当/.test(keyword)) colorClass = 'hl-warn';
      else if (/删除|废止|取消/.test(keyword)) colorClass = 'hl-delete';

      const separator = colon ? colon : ' ';
      return `<strong class="hl-tag ${colorClass}">${keyword}</strong>${separator}`;
    });

    cardText = cardText.replace(/\*\*(.*?)\*\*/g, '<strong class="hl-tag hl-default">$1</strong>');

    // 【核心修复】：精准对齐本地文件，区分“已匹配”和“AI建议”
    cardText = cardText.replace(/【受影响文件】[：:](.*?)(?=\n|$)/g, (m, files) => {
      const fileTags = files.split(/[,、，]/).map(f => {
        const rawName = f.trim();
        if(!rawName) return '';
        // 剥离书名号等干扰字符
        const cleanName = rawName.replace(/[《》<>]/g, '');
        
        // 模糊匹配：判断清洗后的名称是否包含在实际本地文件名列表中
        const isMatch = realFileNames.some(realName => 
            realName.includes(cleanName) || cleanName.includes(realName.replace(/\.[^/.]+$/, ""))
        );

        if (isMatch) {
          // 匹配成功：高亮显示，标记为文档图标
          return `<span class="sop-tag tag-ready" title="匹配成功：存在本地文件">📄 ${cleanName}</span>`;
        } else {
          // 匹配失败：灰化虚线显示，标记为建议项
          return `<span class="sop-tag tag-suggest" title="经验推理：本地库未找到完全一致文件">💡 ${cleanName} <span style="font-weight:normal;font-size:11px;">(建议)</span></span>`;
        }
      }).join('');
      return `<div class="affected-files-wrapper">
                <span class="affected-label">🔍 波及体系：</span>
                <div class="file-tags">${fileTags}</div>
              </div>`;
    });

    cardText = cardText.replace(/\n/g, '<br>');

    return `<div class="change-card">
              <div class="card-num">${num}</div>
              <div class="card-text">${cardText}</div>
            </div>`;
  });

  return html;
}

const startSemanticSearchAndClose = () => {
  showSummaryModal.value = false;
  appStore.triggerSearchSignal++;
}
</script>

<style scoped>
.diff-viewer { display: flex; flex-direction: column; gap: 16px; height: 100%; }

.strategy-selector { display: flex; gap: 12px; background: #f1f5f9; padding: 6px; border-radius: 12px; }
.strategy-option { flex: 1; display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 8px; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; background: white; opacity: 0.6; }
.strategy-option.active { opacity: 1; border-color: #3b82f6; box-shadow: 0 4px 12px rgba(59,130,246,0.1); }
.strategy-option .icon { font-size: 24px; }
.opt-text { display: flex; flex-direction: column; }
.opt-text strong { font-size: 13px; color: #1e293b; }
.opt-text span { font-size: 11px; color: #64748b; }

.upload-container { display: flex; flex-direction: column; gap: 12px; }
.upload-box { display: flex; align-items: center; gap: 12px; padding: 16px; border: 2px dashed #cbd5e1; border-radius: 8px; background-color: #f8fafc; cursor: pointer; transition: all 0.2s; }
.upload-box:hover { border-color: #94a3b8; }
.upload-box.highlight { border-color: #93c5fd; background-color: #eff6ff; }
.box-icon { font-size: 24px; }
.box-text { display: flex; flex-direction: column; }
.box-text strong { font-size: 14px; color: #334155; }
.box-text span { font-size: 11px; color: #64748b; }
.hidden-input { display: none; }

.start-analysis-btn { width: 100%; padding: 16px; background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(37,99,235,0.3); transition: all 0.2s; }
.start-analysis-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(37,99,235,0.4); }
.start-analysis-btn:disabled { background: #cbd5e1; cursor: not-allowed; box-shadow: none; color: #94a3b8; }
.spinner { display: inline-block; animation: blink 1s infinite; }
@keyframes blink { 50% { opacity: 0.5; } }

.progress-container { background: white; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
.progress-track { height: 4px; background: #f1f5f9; border-radius: 2px; overflow: hidden; margin-bottom: 8px; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #8b5cf6); transition: width 0.4s ease; }
.step-labels { display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; font-weight: 600; }
.step-labels span.active { color: #2563eb; }

.error-alert { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; }
.error-header { display: flex; justify-content: space-between; align-items: center; color: #991b1b; font-weight: bold; font-size: 13px; margin-bottom: 6px; }
.close-error { background: none; border: none; color: #f87171; cursor: pointer; font-size: 14px; }
.error-msg { margin: 0; font-size: 12px; color: #b91c1c; line-height: 1.4; word-break: break-all;}

.success-panel { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; text-align: center; }
.success-icon { font-size: 32px; margin-bottom: 8px; }
.success-panel h4 { margin: 0 0 8px 0; color: #166534; font-size: 15px; }
.success-panel p { margin: 0 0 16px 0; color: #15803d; font-size: 12px; }
.outline-btn { width: 100%; padding: 10px; background: white; border: 1px solid #2563eb; color: #2563eb; border-radius: 6px; font-weight: 600; cursor: pointer;}

.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 9999; }
.modal-content { background: #f8fafc; width: 65vw; min-width: 800px; max-width: 1400px; height: 85vh; border-radius: 12px; display: flex; flex-direction: column; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.modal-content.is-maximized { width: 100vw; height: 100vh; max-width: none; min-width: 0; border-radius: 0; }
.modal-header { padding: 16px 24px; border-bottom: 1px solid #e2e8f0; background: white; display: flex; justify-content: space-between; align-items: center;}
.header-titles h3 { margin: 0 0 4px 0; font-size: 18px; color: #0f172a; }
.sub-title { font-size: 13px; color: #3b82f6; font-weight: bold;}
.header-actions { display: flex; align-items: center; gap: 12px; }
.icon-btn { background: white; border: 1px solid #cbd5e1; font-size: 13px; color: #475569; cursor: pointer; padding: 6px 12px; border-radius: 6px; font-weight: 600; transition: all 0.2s; display: flex; align-items: center; gap: 4px; }
.icon-btn:hover { background: #f1f5f9; color: #0f172a; border-color: #94a3b8; }
.close-btn { color: #ef4444; border-color: #fca5a5; }
.close-btn:hover { background: #fef2f2; color: #b91c1c; border-color: #f87171; }
.modal-body { flex: 1; padding: 24px 32px; overflow-y: auto; font-size: 15px; position: relative;}
.modal-footer { padding: 16px 24px; border-top: 1px solid #e2e8f0; background: white; display: flex; justify-content: flex-end; gap: 12px;}
.primary-btn { padding: 12px 24px; background-color: #2563eb; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;}
.secondary-btn { padding: 12px 24px; background-color: #f1f5f9; color: #475569; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;}

/* ======= 高级加载器 CSS ======= */
.advanced-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 400px; gap: 32px; }
.loader-core { position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
.loader-core .icon { font-size: 36px; z-index: 2; animation: loader-pulse 2s infinite; }
.loader-core .circle { position: absolute; border-radius: 50%; border: 3px solid transparent; animation: loader-spin 1.5s linear infinite; }
.loader-core .circle.outer { width: 80px; height: 80px; border-top-color: #3b82f6; border-bottom-color: #8b5cf6; animation-duration: 2s; }
.loader-core .circle.inner { width: 56px; height: 56px; border-left-color: #10b981; border-right-color: #3b82f6; animation-duration: 1.2s; animation-direction: reverse; }
.loader-text { text-align: center; }
.loader-text h4 { margin: 0 0 10px 0; color: #1e293b; font-size: 18px; }
.loader-text p { margin: 0 0 20px 0; color: #64748b; font-size: 14px; }
.loading-bar { width: 260px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin: 0 auto; }
.bar-fill { width: 30%; height: 100%; background: linear-gradient(90deg, transparent, #3b82f6, transparent); animation: loading-scan 1.5s ease-in-out infinite; }
@keyframes loader-spin { 100% { transform: rotate(360deg); } }
@keyframes loader-pulse { 50% { transform: scale(1.15); opacity: 0.8; } }
@keyframes loading-scan { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }

/* ======= 报告卡片样式 ======= */
:deep(.change-card) { display: flex; gap: 16px; margin-bottom: 16px; padding: 16px 20px; border-radius: 8px; border-left: 6px solid #cbd5e1; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 15px; line-height: 1.7; }
:deep(.change-card:nth-of-type(4n+1)) { border-left-color: #ef4444; background: #fef2f2; }
:deep(.change-card:nth-of-type(4n+2)) { border-left-color: #3b82f6; background: #eff6ff; }
:deep(.change-card:nth-of-type(4n+3)) { border-left-color: #10b981; background: #f0fdf4; }
:deep(.change-card:nth-of-type(4n+4)) { border-left-color: #f59e0b; background: #fffbeb; }

:deep(.card-num) { flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 15px; }
:deep(.change-card:nth-of-type(4n+1) .card-num) { background: #ef4444; }
:deep(.change-card:nth-of-type(4n+2) .card-num) { background: #3b82f6; }
:deep(.change-card:nth-of-type(4n+3) .card-num) { background: #10b981; }
:deep(.change-card:nth-of-type(4n+4) .card-num) { background: #f59e0b; }
:deep(.card-text) { flex: 1; margin-top: 3px; color: #334155; }

:deep(.hl-tag) { font-weight: 900; font-family: '黑体', 'Microsoft YaHei', sans-serif; padding: 2px 8px; border-radius: 6px; margin: 0 4px; display: inline-block; line-height: 1.2; box-shadow: 0 2px 4px rgba(0,0,0,0.08); letter-spacing: 1px; }
:deep(.hl-default) { color: #334155; background: #f1f5f9; border: 1px solid #cbd5e1; font-weight: 600; }
:deep(.hl-add) { color: #14532d; background: #bbf7d0; border: 1px solid #4ade80; }
:deep(.hl-edit) { color: #1e3a8a; background: #bfdbfe; border: 1px solid #60a5fa; }
:deep(.hl-warn) { color: #7f1d1d; background: #fecaca; border: 1px solid #f87171; }
:deep(.hl-delete) { color: #7f1d1d; background: #f3f4f6; text-decoration: line-through; border: 1px solid #d1d5db; }

/* ======= 标签匹配 CSS ======= */
:deep(.affected-files-wrapper) { margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(0,0,0,0.1); display: flex; align-items: flex-start; gap: 8px; }
:deep(.affected-label) { font-size: 13px; color: #64748b; font-weight: 600; white-space: nowrap; margin-top: 4px; }
:deep(.file-tags) { display: flex; flex-wrap: wrap; gap: 8px; }

:deep(.sop-tag) { padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
/* 本地库匹配成功：蓝色实心 */
:deep(.tag-ready) { background-color: #eff6ff; color: #2563eb; border: 1px solid #3b82f6; cursor: default; }
/* 本地库未找到：灰色虚线 */
:deep(.tag-suggest) { background-color: #f8fafc; color: #94a3b8; border: 1px dashed #cbd5e1; font-style: italic; opacity: 0.8; }
</style>
