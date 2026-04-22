import { nowDate, nowTime, parseBody, sendJson } from './_lib/http.js'
import { getStore } from './_lib/store.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { message: 'Method Not Allowed' })
    return
  }

  const body = await parseBody(request)
  const store = getStore()
  const project = {
    id: `p-${Date.now()}`,
    name: body.name || '未命名项目',
    market: body.market || '待配置',
    stage: body.stage || '新建项目',
    updatedAt: nowDate(),
    riskLevel: body.riskLevel || '中',
  }

  store.projects.unshift(project)
  store.activities.unshift({
    id: `a-${Date.now()}`,
    time: nowTime(),
    title: '新项目已创建',
    detail: `${project.name} 已加入项目列表。`,
  })

  sendJson(response, 201, project)
}
