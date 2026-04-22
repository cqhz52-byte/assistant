import { recentCases } from './clinicalData'
import { API_BASE_URL, readStoredSession, request } from './api'

const SESSION_KEY = 'curaway-case-session'
const DEMO_CASES_KEY = 'curaway-demo-cases'
const DEMO_EMAIL = 'demo@curaway.local'
const DEMO_PASSWORD = 'Demo123456'
const DEMO_TOKEN = 'demo-access-token'

const demoProfile = {
  id: 'demo-user',
  email: DEMO_EMAIL,
  name: '演示工程师',
  role: 'engineer',
  department: '临床支持部',
  region: '全国',
}

const demoCredentials = {
  email: DEMO_EMAIL,
  password: DEMO_PASSWORD,
}

function persistSession(session) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function clearSession() {
  window.localStorage.removeItem(SESSION_KEY)
}

function isDemoSession(session) {
  return session?.mode === 'demo' || session?.token === DEMO_TOKEN
}

function formatErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function buildDemoCase(caseCard, index) {
  return {
    id: caseCard.id,
    caseDate: `2026-04-${String(20 + index).padStart(2, '0')}`,
    hospitalId: `demo-hospital-${index + 1}`,
    hospitalName: caseCard.hospital,
    doctorName: caseCard.doctor,
    engineerId: demoProfile.id,
    engineerName: demoProfile.name,
    productLineId: `demo-product-${index + 1}`,
    productLineName: caseCard.productLine,
    deviceId: `demo-device-${index + 1}`,
    deviceName: caseCard.device,
    surgeryType: caseCard.productLine,
    status: caseCard.status,
    abnormal: false,
    notes: caseCard.summary,
    outcome: caseCard.summary,
    complications: '未见异常',
    parameters: {},
    consumables: [],
    attachments: [],
    createdAt: caseCard.updatedAt,
    updatedAt: caseCard.updatedAt,
  }
}

function getDemoSeedCases() {
  return recentCases.map(buildDemoCase)
}

function readDemoCases() {
  try {
    const raw = window.localStorage.getItem(DEMO_CASES_KEY)
    if (!raw) return getDemoSeedCases()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : getDemoSeedCases()
  } catch {
    return getDemoSeedCases()
  }
}

function writeDemoCases(cases) {
  window.localStorage.setItem(DEMO_CASES_KEY, JSON.stringify(cases))
}

function createDemoSession() {
  return {
    token: DEMO_TOKEN,
    mode: 'demo',
    user: demoProfile,
  }
}

async function getCurrentSession() {
  const session = readStoredSession()
  if (!session?.token) return { session: null }

  if (isDemoSession(session)) {
    const nextSession = createDemoSession()
    persistSession(nextSession)
    return { session: nextSession }
  }

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
  const session = readStoredSession()
  if (isDemoSession(session)) return demoProfile

  const data = await request('/auth/me')
  return data.user
}

async function signInWithPassword(email, password) {
  if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
    const session = createDemoSession()
    persistSession(session)
    return session
  }

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
  if (email === DEMO_EMAIL) {
    throw new Error('演示账号为内置只读账号，请直接使用登录。')
  }

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
  const session = readStoredSession()
  if (isDemoSession(session)) {
    const cases = readDemoCases().sort((left, right) => {
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    })

    return {
      cases,
      totalCases: cases.length,
      completedCases: cases.filter((item) => item.status === '已完成').length,
      pendingSync: cases.filter((item) => item.status === '待同步').length,
    }
  }

  return request('/case-support/bootstrap')
}

async function createCaseRecord(payload) {
  const session = readStoredSession()
  if (isDemoSession(session)) {
    const demoCase = {
      id: `DEMO-${Date.now()}`,
      caseDate: payload.caseDate,
      hospitalId: payload.hospitalId,
      hospitalName: payload.hospitalName,
      doctorName: payload.doctorName,
      engineerId: demoProfile.id,
      engineerName: payload.engineerName || demoProfile.name,
      productLineId: payload.productLineId,
      productLineName: payload.productLineName,
      deviceId: payload.deviceId,
      deviceName: payload.deviceName,
      surgeryType: payload.surgeryType,
      status: payload.status,
      abnormal: Boolean(payload.abnormal),
      notes: payload.notes || '',
      outcome: payload.outcome || '',
      complications: payload.complications || '',
      parameters: payload.parameters ?? {},
      consumables: payload.consumables ?? [],
      attachments: payload.attachments ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const currentCases = readDemoCases()
    const nextCases = [demoCase, ...currentCases]
    writeDemoCases(nextCases)

    return {
      case: demoCase,
      totalCases: nextCases.length,
    }
  }

  return request('/case-support/cases', {
    method: 'POST',
    body: payload,
  })
}

function getModeLabel() {
  const session = readStoredSession()
  return isDemoSession(session) ? '演示模式 · 本地浏览器数据' : `公司服务器模式 · ${API_BASE_URL}`
}

export {
  createCaseRecord,
  demoCredentials,
  demoProfile,
  formatErrorMessage,
  getCaseSupportBootstrap,
  getCurrentProfile,
  getCurrentSession,
  getModeLabel,
  isDemoSession,
  signInWithPassword,
  signOut,
  signUpWithPassword,
}
