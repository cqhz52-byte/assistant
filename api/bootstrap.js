import { sendJson } from './_lib/http.js'
import { getStore } from './_lib/store.js'

export default function handler(request, response) {
  if (request.method !== 'GET') {
    sendJson(response, 405, { message: 'Method Not Allowed' })
    return
  }
  sendJson(response, 200, getStore())
}
