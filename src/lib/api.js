const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

function buildUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

function readStoredSession() {
  try {
    const raw = window.localStorage.getItem('curaway-case-session')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

async function request(path, options = {}) {
  const session = readStoredSession()
  const headers = new Headers(options.headers ?? {})
  const payload = options.body

  if (payload !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (session?.token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${session.token}`)
  }

  let response

  try {
    response = await fetch(buildUrl(path), {
      ...options,
      headers,
      body: payload === undefined ? undefined : JSON.stringify(payload),
    })
  } catch {
    throw new Error('无法连接公司病例服务器，请检查内网访问或 API 地址。')
  }

  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    if (typeof data === 'object' && data?.message) {
      throw new Error(data.message)
    }

    throw new Error(typeof data === 'string' && data ? data : '请求失败，请稍后重试。')
  }

  return data
}

export { API_BASE_URL, readStoredSession, request }
