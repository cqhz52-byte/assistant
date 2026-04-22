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

export function getCaseSupportBootstrap() {
  return request('/api/case-support/bootstrap')
}

export function createCaseRecord(payload) {
  return request('/api/case-support/cases', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}
