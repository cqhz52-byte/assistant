import { sendJson } from '../_lib/http.js'
import { getStore } from '../_lib/store.js'

export default function handler(request, response) {
  if (request.method !== 'GET') {
    sendJson(response, 405, { message: 'Method Not Allowed' })
    return
  }

  const store = getStore()
  const cases = store.caseSupport?.cases ?? []

  sendJson(response, 200, {
    cases: cases.slice(0, 12),
    totalCases: cases.length,
    completedCases: cases.filter((item) => item.status === '已完成').length,
    pendingSync: cases.filter((item) => item.status === '待同步').length,
  })
}
