import { sendJson } from './_lib/http.js'

export default function handler(request, response) {
  if (request.method !== 'GET') {
    sendJson(response, 405, { message: 'Method Not Allowed' })
    return
  }
  sendJson(response, 200, { ok: true, date: new Date().toISOString() })
}
