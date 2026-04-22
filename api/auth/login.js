import { parseBody, sendJson } from '../_lib/http.js'
import { getStore } from '../_lib/store.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { message: 'Method Not Allowed' })
    return
  }

  const body = await parseBody(request)
  if (!body.email || !body.password) {
    sendJson(response, 400, { message: '请输入邮箱和密码。' })
    return
  }

  const store = getStore()
  sendJson(response, 200, {
    token: 'demo-token',
    user: store.user,
  })
}
