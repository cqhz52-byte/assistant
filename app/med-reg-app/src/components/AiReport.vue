<template>
  <div class="ai-report">
    <div v-if="currentStep === -1" class="empty-state">
      <span class="icon">🤖</span>
      <p>等待接收本地 SOP 片段...</p>
      <span class="hint">请在左侧点击“锁定分片”以启动深度分析</span>
    </div>

    <div v-else class="report-container">
      <div class="processing-card">
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: progressWidth + '%' }"></div>
        </div>
        <div class="steps-row">
          <div v-for="(step, index) in steps" :key="index" class="step-item" :class="{ 'active': currentStep === index, 'completed': currentStep > index }">
            <div class="dot-wrapper"><span class="step-dot"></span></div>
            <span class="step-label">{{ step }}</span>
          </div>
        </div>
      </div>

      <div class="report-content-wrapper">
        <div class="section-title">
          <span class="title-text">📄 针对局部条款的修订建议</span>
          <span v-if="isAnalyzing" class="ai-tag blink">AI 深度思考中...</span>
          <span v-else class="ai-tag success">分析完成</span>
        </div>
        
        <div class="source-box">
          <div class="label">当前分析文件: {{ targetFileName }}</div>
          <p class="source-text">{{ targetSopChunk }}</p>
        </div>

        <div class="ai-response-box custom-markdown">
          <div v-if="reportContent" v-html="formatReport(reportContent)"></div>
          <div v-if="isAnalyzing && !reportContent" class="loading-placeholder">正在对齐最新法规要求，构建合规逻辑...</div>
          <span v-if="isAnalyzing" class="cursor">▌</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useMultimodal } from '../hooks/useMultimodal.js'
import { appStore } from '../store.js'
import { loadApiConfig } from '../services/apiConfig.js'

const { analyzeWithAI } = useMultimodal()

const steps = ['提取片段', '语义比对', '生成建议']
const currentStep = ref(-1)
const isAnalyzing = ref(false)
const reportContent = ref('')
const targetSopChunk = ref('')
const targetFileName = ref('')

const progressWidth = computed(() => {
  if (currentStep.value === -1) return 0
  if (currentStep.value >= steps.length) return 100
  return ((currentStep.value + 1) / steps.length) * 100
})

// 【核心】：监听信号，一旦点击中间卡片，这里就会立刻被激活
watch(() => appStore.triggerAnalysisSignal, () => {
  if (appStore.triggerAnalysisSignal > 0) {
    // 1. 同步 Store 中的数据到本地变量
    targetSopChunk.value = appStore.targetSopChunk
    targetFileName.value = appStore.targetSopFileName
    
    // 2. 启动 AI 调用逻辑
    startAnalysis()
  }
})

const startAnalysis = async () => {
  const config = loadApiConfig()
  if (!config || !config.apiKey) {
    alert("⚠️ 请先配置 API Key！")
    return
  }

  currentStep.value = 0
  isAnalyzing.value = true
  reportContent.value = ''

  try {
    const finalBaseUrl = config.baseUrl || 'https://api.deepseek.com'
    currentStep.value = 1
    
    const systemPrompt = `你是一个严谨的医疗器械合规专家。请对比提供的“新规摘要”与“本地SOP片段”，直接给出具体修订建议。
格式要求：
1. 使用 "### " 作为标题。
2. 引用原 SOP 内容请使用 "> "。
3. 重点词汇请使用 "**加粗**"。`

    await analyzeWithAI({
      apiKey: config.apiKey,
      baseUrl: finalBaseUrl,
      model: config.model || 'deepseek-chat',
      systemPrompt: systemPrompt,
      userText: `【新规核心摘要】：\n${appStore.aiSummary}\n\n【待修改本地 SOP】：\n文件：${targetFileName.value}\n内容：${targetSopChunk.value}\n\n请给出具体的差异分析与修订建议。`,
      onChunk: (text) => {
        if (currentStep.value === 1) currentStep.value = 2
        reportContent.value += text
      }
    })
    
    isAnalyzing.value = false
    currentStep.value = 3
  } catch (e) {
    isAnalyzing.value = false
    currentStep.value = -1
    reportContent.value = `❌ 分析失败: ${e.message}`
  }
}

// Markdown 渲染格式化（保持你的精美 CSS 染色）
const formatReport = (text) => {
  if (!text) return ''
  let html = text.replace(/(?:^|\n)>\s?(.*?)(?=\n|$)/g, '<blockquote class="ai-quote">$1</blockquote>')
  html = html.replace(/(?:^|\n)###\s+(.*?)(?=\n|$)/g, '<h4 class="ai-heading">$1</h4>')
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="ai-highlight">$1</strong>')
  html = html.replace(/\n\n/g, '</p><p class="ai-paragraph">')
  html = html.replace(/\n/g, '<br>')
  return `<p class="ai-paragraph">${html}</p>`
}
</script>

<style scoped>
/* 样式保持不变... */
.ai-report { display: flex; flex-direction: column; height: 100%; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; color: #94a3b8; border: 2px dashed #e2e8f0; border-radius: 12px; margin: 20px;}
.empty-state .icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
.hint { font-size: 12px; margin-top: 10px; color: #3b82f6; background: #eff6ff; padding: 4px 12px; border-radius: 20px; }
.report-container { display: flex; flex-direction: column; gap: 20px; padding: 0 10px; height: 100%; overflow: hidden; }
.processing-card { background: white; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0; }
.progress-track { height: 4px; background: #f1f5f9; border-radius: 2px; overflow: hidden; margin-bottom: 10px; }
.progress-fill { height: 100%; background: #2563eb; transition: width 0.4s; }
.steps-row { display: flex; justify-content: space-between; }
.step-label { font-size: 10px; color: #64748b; font-weight: 600; }
.report-content-wrapper { flex: 1; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; padding-bottom: 20px;}
.section-title { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
.title-text { font-size: 13px; font-weight: 800; color: #1e293b; }
.ai-tag { font-size: 10px; padding: 2px 8px; border-radius: 4px; background: #eff6ff; color: #2563eb; }
.ai-tag.success { background: #dcfce7; color: #166534; }
.blink { animation: blink-ani 1.5s infinite; }
@keyframes blink-ani { 50% { opacity: 0.5; } }
.source-box { background: #fffbeb; padding: 10px; border-radius: 6px; border-left: 4px solid #f59e0b; }
.source-box .label { font-size: 10px; color: #b45309; font-weight: bold; margin-bottom: 4px; }
.source-text { font-size: 12px; color: #475569; margin: 0; line-height: 1.5; }
.ai-response-box { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; min-height: 200px; font-size: 13px; line-height: 1.6; color: #334155;}
.cursor { color: #2563eb; animation: flash 1s infinite; }
@keyframes flash { 50% { opacity: 0; } }

:deep(.ai-paragraph) { margin-bottom: 8px; }
:deep(.ai-heading) { font-size: 14px; color: #1e293b; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-top: 16px; }
:deep(.ai-quote) { background: #f8fafc; border-left: 4px solid #cbd5e1; padding: 8px 12px; margin: 8px 0; font-size: 12px; color: #475569; }
:deep(.ai-highlight) { color: #166534; background: #dcfce7; padding: 0 4px; border-radius: 2px; }
</style>
