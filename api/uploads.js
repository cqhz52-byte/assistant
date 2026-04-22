import { nowDate, nowTime, parseBody, sendJson } from './_lib/http.js'
import { getStore } from './_lib/store.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { message: 'Method Not Allowed' })
    return
  }

  const body = await parseBody(request)
  const store = getStore()
  const document = {
    id: `d-${Date.now()}`,
    projectId: body.projectId || store.projects[0]?.id || 'p-unknown',
    name: body.name || '未命名文件',
    type: body.type || '未分类',
    size: body.size || '未知大小',
    updatedAt: nowDate(),
    status: '已导入待处理',
  }

  store.documents.unshift(document)
  store.activities.unshift({
    id: `a-${Date.now() + 1}`,
    time: nowTime(),
    title: '新文件已导入',
    detail: `${document.name} 已进入知识库处理队列。`,
  })

  sendJson(response, 201, document)
}
