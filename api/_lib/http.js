export function sendJson(response, status, payload) {
  response.status(status).json(payload)
}

export function nowDate() {
  return new Date().toISOString().slice(0, 10)
}

export function nowTime() {
  return new Date().toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export async function parseBody(request) {
  if (request.body && typeof request.body === 'object') {
    return request.body
  }

  if (typeof request.body === 'string' && request.body.trim()) {
    try {
      return JSON.parse(request.body)
    } catch {
      return {}
    }
  }

  let raw = ''
  for await (const chunk of request) {
    raw += chunk
  }
  if (!raw) return {}

  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}
