const hospitals = [
  { id: 'hsp-shzy', name: '上海中医药大学附属龙华医院', region: '华东', level: '三甲' },
  { id: 'hsp-bjxt', name: '北京协和医院', region: '华北', level: '三甲' },
  { id: 'hsp-gzfy', name: '广州医科大学附属第一医院', region: '华南', level: '三甲' },
  { id: 'hsp-cqsw', name: '重庆市肿瘤医院', region: '西南', level: '三甲' },
  { id: 'hsp-whzx', name: '武汉大学中南医院', region: '华中', level: '三甲' },
]

const devices = [
  {
    id: 'dev-ire-2000',
    modelName: 'IRE-2000 脉冲消融系统',
    category: '消融',
    snPrefix: 'IRE',
    parameterSchema: [
      { key: 'outputPower', label: '输出功率', unit: 'W', placeholder: '80', min: 0, max: 300 },
      { key: 'negativePressure', label: '吸引压力', unit: 'kPa', placeholder: '18', min: 0, max: 100 },
      { key: 'duration', label: '作用时长', unit: 'min', placeholder: '25', min: 0, max: 240 },
    ],
  },
  {
    id: 'dev-rf-90',
    modelName: 'RF-90 射频热凝仪',
    category: '射频',
    snPrefix: 'RF',
    parameterSchema: [
      { key: 'outputPower', label: '输出功率', unit: 'W', placeholder: '65', min: 0, max: 200 },
      { key: 'targetTemp', label: '靶温', unit: '°C', placeholder: '90', min: 0, max: 120 },
      { key: 'duration', label: '维持时长', unit: 's', placeholder: '120', min: 0, max: 600 },
    ],
  },
  {
    id: 'dev-endo-360',
    modelName: 'EndoFlow 360 冲吸平台',
    category: '内镜',
    snPrefix: 'ENF',
    parameterSchema: [
      { key: 'flowRate', label: '冲洗流速', unit: 'mL/min', placeholder: '450', min: 0, max: 1200 },
      { key: 'negativePressure', label: '吸引压力', unit: 'kPa', placeholder: '15', min: 0, max: 100 },
      { key: 'duration', label: '使用时长', unit: 'min', placeholder: '40', min: 0, max: 240 },
    ],
  },
]

const surgeries = ['肝肿瘤消融', '甲状腺结节', '肺结节消融', '泌尿外科', '妇科肿瘤', '其他']

const dashboardMetrics = [
  { id: 'today', label: '今日跟台', value: '5 场', helper: '其中 2 场正在进行' },
  { id: 'month', label: '本月累计', value: '42 场', helper: '较上月提升 18%' },
  { id: 'warning', label: '耗材预警', value: '3 项', helper: '需补货批次 2 个' },
  { id: 'sync', label: '离线队列', value: '1 条', helper: '等待网络恢复自动同步' },
]

const todayTasks = [
  {
    id: 'task-1',
    time: '08:30',
    hospital: '上海中医药大学附属龙华医院',
    doctor: '朱海峰',
    procedure: '肝肿瘤 IRE 消融',
    status: '进行中',
  },
  {
    id: 'task-2',
    time: '10:40',
    hospital: '北京协和医院',
    doctor: '李颖',
    procedure: '射频热凝复核',
    status: '待开始',
  },
  {
    id: 'task-3',
    time: '14:00',
    hospital: '武汉大学中南医院',
    doctor: '周玮',
    procedure: '内镜冲吸系统支持',
    status: '待确认',
  },
]

const recentCases = [
  {
    id: 'case-20260422-001',
    hospital: '重庆市肿瘤医院',
    doctor: '刘晨',
    device: 'IRE-2000 脉冲消融系统',
    status: '已完成',
    summary: '双针通道建立顺利，术中参数稳定。',
    updatedAt: '2026-04-22T09:20:00+08:00',
  },
  {
    id: 'case-20260421-014',
    hospital: '广州医科大学附属第一医院',
    doctor: '陈莉',
    device: 'RF-90 射频热凝仪',
    status: '进行中',
    summary: '第 2 阶段温控观察中，暂未见异常。',
    updatedAt: '2026-04-21T16:45:00+08:00',
  },
  {
    id: 'case-20260420-007',
    hospital: '上海中医药大学附属龙华医院',
    doctor: '杨博',
    device: 'EndoFlow 360 冲吸平台',
    status: '已完成',
    summary: '耗材批号已核对，术后已上传照片 2 张。',
    updatedAt: '2026-04-20T18:10:00+08:00',
  },
]

const moduleRoadmap = [
  {
    id: 'capture',
    title: '跟台数据录入',
    description: '动态加载设备参数、扫码录入耗材批号，并允许现场拍照补充记录。',
  },
  {
    id: 'offline',
    title: '离线缓存与同步',
    description: 'IndexedDB 本地草稿缓存，网络恢复后可无感同步到云端。',
  },
  {
    id: 'dashboard',
    title: '工程师与管理仪表盘',
    description: '统计跟台场次、区域分布、故障率与高频耗材预警。',
  },
  {
    id: 'compliance',
    title: '合规与脱敏',
    description: '患者信息仅保留编号，并为影像资料预留权限与审计字段。',
  },
]

const schemaHighlights = [
  { table: 'users', columns: 'id, name, role, department, region' },
  { table: 'hospitals', columns: 'id, name, region, level' },
  { table: 'devices', columns: 'id, model_name, category, sn_prefix, parameter_schema' },
  { table: 'clinical_cases', columns: 'id, date, hospital_id, doctor_name, engineer_id, status' },
  { table: 'case_details', columns: 'case_id, device_id, parameters, outcome, complications' },
  { table: 'consumables', columns: 'id, case_id, item_name, quantity, batch_no' },
  { table: 'media', columns: 'id, case_id, file_url, type, captured_at' },
]

function createEntryId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

function formatDateInput(date = new Date()) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function createEmptyConsumable() {
  return {
    id: createEntryId('consumable'),
    itemName: '',
    quantity: 1,
    batchNo: '',
  }
}

function createDefaultCaseDraft() {
  return {
    caseDate: formatDateInput(),
    hospitalId: '',
    doctorName: '',
    surgeryType: surgeries[0],
    engineerName: '王工',
    deviceId: devices[0].id,
    status: '待执行',
    notes: '',
    abnormal: false,
    outcome: '',
    complications: '',
    parameters: {},
    attachments: [],
    consumables: [createEmptyConsumable()],
  }
}

export {
  createDefaultCaseDraft,
  createEmptyConsumable,
  createEntryId,
  dashboardMetrics,
  devices,
  hospitals,
  moduleRoadmap,
  recentCases,
  schemaHighlights,
  surgeries,
  todayTasks,
}
