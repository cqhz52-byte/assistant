import { createLocalCaseRecord, getLocalCaseSupportBootstrap } from './api'
import { supabase, supabaseConfigured } from './supabaseClient'

const demoProfile = {
  id: 'demo-local-user',
  email: 'demo@local.curaway',
  name: 'Curaway 演示账号',
  role: 'admin',
  department: 'Case Support',
  region: '全国',
}

function formatErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function mapCaseFromDatabase(caseItem) {
  return {
    id: caseItem.id,
    caseDate: caseItem.case_date,
    hospitalId: caseItem.hospital_id,
    hospitalName: caseItem.hospital_name,
    doctorName: caseItem.doctor_name,
    engineerName: caseItem.engineer_name,
    productLineId: caseItem.product_line_id,
    productLineName: caseItem.product_line_name,
    deviceId: caseItem.device_id,
    deviceName: caseItem.device_name,
    surgeryType: caseItem.surgery_type,
    status: caseItem.status,
    abnormal: caseItem.abnormal,
    notes: caseItem.notes,
    outcome: caseItem.outcome,
    complications: caseItem.complications,
    parameters: caseItem.parameters ?? {},
    consumables: caseItem.consumables ?? [],
    attachments: caseItem.attachments ?? [],
    createdAt: caseItem.created_at,
    updatedAt: caseItem.updated_at,
  }
}

function mapCaseToDatabase(payload, userId) {
  return {
    created_by: userId,
    case_date: payload.caseDate,
    hospital_id: payload.hospitalId,
    hospital_name: payload.hospitalName,
    doctor_name: payload.doctorName,
    engineer_name: payload.engineerName,
    product_line_id: payload.productLineId,
    product_line_name: payload.productLineName,
    device_id: payload.deviceId,
    device_name: payload.deviceName,
    surgery_type: payload.surgeryType,
    status: payload.status,
    abnormal: Boolean(payload.abnormal),
    notes: payload.notes || '',
    outcome: payload.outcome || '',
    complications: payload.complications || '',
    parameters: payload.parameters ?? {},
    consumables: payload.consumables ?? [],
    attachments: payload.attachments ?? [],
  }
}

async function ensureSupabase() {
  if (!supabaseConfigured || !supabase) {
    throw new Error('Supabase 未配置，请先在环境变量中填写项目地址和匿名密钥。')
  }
  return supabase
}

async function getCurrentSession() {
  if (!supabaseConfigured) {
    return {
      session: {
        user: {
          id: demoProfile.id,
          email: demoProfile.email,
          user_metadata: {
            name: demoProfile.name,
            role: demoProfile.role,
          },
        },
      },
    }
  }

  const client = await ensureSupabase()
  const { data, error } = await client.auth.getSession()
  if (error) throw error
  return { session: data.session }
}

function onAuthStateChange(callback) {
  if (!supabaseConfigured || !supabase) {
    return () => {}
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })

  return () => {
    data.subscription.unsubscribe()
  }
}

async function signInWithPassword(email, password) {
  const client = await ensureSupabase()
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data.session
}

async function signUpWithPassword({ email, password, name, role }) {
  const client = await ensureSupabase()
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role,
      },
    },
  })
  if (error) throw error
  return data
}

async function signOut() {
  if (!supabaseConfigured || !supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

async function getCurrentProfile(user) {
  if (!supabaseConfigured || !supabase) return demoProfile
  if (!user?.id) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, role, department, region')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw error

  return (
    data ?? {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split('@')[0] || '未命名用户',
      role: user.user_metadata?.role || 'engineer',
      department: '',
      region: '',
    }
  )
}

async function getCaseSupportBootstrap() {
  if (!supabaseConfigured || !supabase) {
    return getLocalCaseSupportBootstrap()
  }

  const [{ data: recentCases, error: recentError, count: totalCases }, completedResult, pendingResult] =
    await Promise.all([
      supabase
        .from('clinical_cases')
        .select('*', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .limit(12),
      supabase
        .from('clinical_cases')
        .select('id', { count: 'exact', head: true })
        .eq('status', '已完成'),
      supabase
        .from('clinical_cases')
        .select('id', { count: 'exact', head: true })
        .eq('status', '待同步'),
    ])

  if (recentError) throw recentError
  if (completedResult.error) throw completedResult.error
  if (pendingResult.error) throw pendingResult.error

  return {
    cases: (recentCases ?? []).map(mapCaseFromDatabase),
    totalCases: totalCases ?? 0,
    completedCases: completedResult.count ?? 0,
    pendingSync: pendingResult.count ?? 0,
  }
}

async function createCaseRecord(payload, currentUserId) {
  if (!supabaseConfigured || !supabase) {
    return createLocalCaseRecord(payload)
  }

  const { data, error } = await supabase
    .from('clinical_cases')
    .insert([mapCaseToDatabase(payload, currentUserId)])
    .select('*')
    .single()

  if (error) throw error

  const { count, error: countError } = await supabase
    .from('clinical_cases')
    .select('id', { count: 'exact', head: true })

  if (countError) throw countError

  return {
    case: mapCaseFromDatabase(data),
    totalCases: count ?? 0,
  }
}

function getModeLabel() {
  return supabaseConfigured ? 'Supabase 在线模式' : '本地演示模式'
}

export {
  createCaseRecord,
  demoProfile,
  formatErrorMessage,
  getCaseSupportBootstrap,
  getCurrentProfile,
  getCurrentSession,
  getModeLabel,
  onAuthStateChange,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  supabaseConfigured,
}
