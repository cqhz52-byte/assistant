import { reactive } from 'vue'

export const appStore = reactive({
  // 存放左侧 AI 提炼出的新规摘要
  aiSummary: '',
  
  // 存放中间栏扫描到的真实本地文件列表
  availableFiles: [],
  
  // 触发信号：通知中间栏开始进行 RAG 检索
  triggerSearchSignal: 0,
  
  // 存放即将被深度分析的 SOP 原文片段和【对应的文件名】
  targetSopFileName: '',
  targetSopChunk: '',
  
  // 触发信号：通知右侧栏开始 AI 深度分析
  triggerAnalysisSignal: 0,

  // 【新增】：存放用户手工指定的本地大模型文件集合 (File 对象)
  customModelFiles: []
})