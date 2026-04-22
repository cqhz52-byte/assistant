const jsonHeaders = {
  'Content-Type': 'application/json',
}

async function request(path, options = {}) {
  const response = await fetch(path, options)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || '请求失败')
  }
  return data
}

export function login(payload) {
  return request('/api/auth/login', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}

export function getBootstrap() {
  return request('/api/bootstrap')
}

export function createProject(payload) {
  return request('/api/projects', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}

export function generateCopilot(payload) {
  return request('/api/copilot/generate', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}

export function uploadDocument(payload) {
  return request('/api/uploads', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}
