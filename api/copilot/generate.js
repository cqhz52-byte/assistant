import { nowTime, parseBody, sendJson } from '../_lib/http.js'
import { getStore } from '../_lib/store.js'

function createCopilotOutput(prompt, section, tool) {
  return {
    title: `${tool} 已生成建议`,
    summary: `围绕“${section}”已生成结构化建议，可直接转入人工审核。`,
    bullets: [
      `根据任务“${prompt}”补充法规引用与术语一致性检查。`,
      '建议把关键变更同步到 CER、IFU 和风险管理文件。',
      '保留审阅节点，由注册、临床和 QA 分别确认高风险章节。',
    ],
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { message: 'Method Not Allowed' })
    return
  }

  const body = await parseBody(request)
  const output = createCopilotOutput(
    body.prompt || '未命名任务',
    body.section || '通用章节',
    body.tool || 'AI Copilot',
  )

  const store = getStore()
  store.activities.unshift({
    id: `a-${Date.now()}`,
    time: nowTime(),
    title: output.title,
    detail: output.summary,
  })

  sendJson(response, 200, output)
}
