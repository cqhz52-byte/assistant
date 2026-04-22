import { API_BASE_URL, readStoredSession, request } from './api'

const SESSION_KEY = 'curaway-case-session'

const demoProfile = {
  id: '',
  email: '',
  name: '',
  role: 'engineer',
  department: '临床支持部',
  region: '华东',
}

function persistSession(session) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function clearSession() {
  window.localStorage.removeItem(SESSION_KEY)
}

function formatErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

async function getCurrentSession() {
  const session = readStoredSession()
  if (!session?.token) return { session: null }

  try {
    const data = await request('/auth/me')
    const verifiedSession = {
      token: session.token,
      user: data.user,
    }
    persistSession(verifiedSession)

    return { session: verifiedSession }
  } catch {
    clearSession()
    return { session: null }
  }
}

async function getCurrentProfile() {
  const data = await request('/auth/me')
  return data.user
}

async function signInWithPassword(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  })

  const session = {
    token: data.access_token,
    user: data.user,
  }

  persistSession(session)
  return session
}

async function signUpWithPassword({ email, password, name, role }) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: { email, password, name, role },
  })

  const session = {
    token: data.access_token,
    user: data.user,
  }

  persistSession(session)
  return session
}

async function signOut() {
  clearSession()
}

async function getCaseSupportBootstrap() {
  return request('/case-support/bootstrap')
}

async function createCaseRecord(payload) {
  return request('/case-support/cases', {
    method: 'POST',
    body: payload,
  })
}

function getModeLabel() {
  return `公司服务器模式 · ${API_BASE_URL}`
}

export {
  createCaseRecord,
  demoProfile,
  formatErrorMessage,
  getCaseSupportBootstrap,
  getCurrentProfile,
  getCurrentSession,
  getModeLabel,
  signInWithPassword,
  signOut,
  signUpWithPassword,
}
