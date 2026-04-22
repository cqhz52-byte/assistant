import { parseBody, sendJson } from '../_lib/http.js'
import { getStore } from '../_lib/store.js'

function normalizeCase(payload) {
  return {
    id: `case-${Date.now()}`,
    caseDate: payload.caseDate || new Date().toISOString().slice(0, 10),
    hospitalId: payload.hospitalId || '',
    hospitalName: payload.hospitalName || '未选择医院',
    doctorName: payload.doctorName || '未填写医生',
    engineerName: payload.engineerName || '未填写工程师',
    productLineId: payload.productLineId || '',
    productLineName: payload.productLineName || '未选择产品线',
    deviceId: payload.deviceId || '',
    deviceName: payload.deviceName || '未选择设备',
    surgeryType: payload.surgeryType || '未选择术式',
    status: payload.status || '待同步',
    abnormal: Boolean(payload.abnormal),
    notes: payload.notes || '',
    outcome: payload.outcome || '',
    complications: payload.complications || '',
    parameters: payload.parameters || {},
    consumables: Array.isArray(payload.consumables) ? payload.consumables : [],
    attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export default async function handler(request, response) {
  const store = getStore()
  store.caseSupport ||= { cases: [] }

  if (request.method === 'GET') {
    sendJson(response, 200, {
      cases: store.caseSupport.cases,
    })
    return
  }

  if (request.method !== 'POST') {
    sendJson(response, 405, { message: 'Method Not Allowed' })
    return
  }

  const body = await parseBody(request)

  if (!body.hospitalName || !body.doctorName || !body.deviceName) {
    sendJson(response, 400, { message: '请先完整填写医院、医生和设备信息。' })
    return
  }

  const nextCase = normalizeCase(body)
  store.caseSupport.cases.unshift(nextCase)

  sendJson(response, 201, {
    case: nextCase,
    totalCases: store.caseSupport.cases.length,
  })
}
