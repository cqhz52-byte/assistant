import { ref } from 'vue'

export function useFileSystem() {
  const isScanning = ref(false)
  const scannedFiles = ref([])

  // 核心 1：请求用户授权读取本地文件夹
  const selectAndScanDirectory = async () => {
    try {
      // 唤起操作系统原生的“选择文件夹”对话框
      const dirHandle = await window.showDirectoryPicker({
        mode: 'read', // 只需要读取权限
      })
      
      isScanning.value = true
      scannedFiles.value = [] // 清空旧数据

      // 开始递归读取文件夹
      await processDirectory(dirHandle)
      
      return scannedFiles.value
    } catch (error) {
      console.error('读取文件夹被取消或发生错误:', error)
    } finally {
      isScanning.value = false
    }
  }

  // 核心 2：递归处理逻辑 (识别 Word 和 PDF)
  const processDirectory = async (dirHandle, path = '') => {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const lowerName = entry.name.toLowerCase()
        // 只过滤出医疗器械常用的文档格式
        if (lowerName.endsWith('.docx') || lowerName.endsWith('.pdf')) {
          const file = await entry.getFile()
          
          scannedFiles.value.push({
            name: entry.name,
            path: `${path}/${entry.name}`,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB', // 转换为 MB
            type: lowerName.endsWith('.pdf') ? 'pdf' : 'word',
            // 关键：保留文件的原生句柄。
            // 这样几百个文件就不会全部塞爆内存，只有当AI确定要分析某份文件时，系统才通过 handle 临时读取它
            handle: entry 
          })
        }
      } else if (entry.kind === 'directory') {
        // 如果是子文件夹，继续往下钻 (递归)
        await processDirectory(entry, `${path}/${entry.name}`)
      }
    }
  }

  return { isScanning, scannedFiles, selectAndScanDirectory }
}