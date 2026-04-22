const hospitals = [
  { id: 'hsp-shzy', name: '上海中医药大学附属龙华医院', region: '华东', level: '三甲' },
  { id: 'hsp-bjxt', name: '北京协和医院', region: '华北', level: '三甲' },
  { id: 'hsp-gzfy', name: '广州医科大学附属第一医院', region: '华南', level: '三甲' },
  { id: 'hsp-cqsw', name: '重庆市肿瘤医院', region: '西南', level: '三甲' },
  { id: 'hsp-whzx', name: '武汉大学中南医院', region: '华中', level: '三甲' },
  { id: 'hsp-xajd', name: '西安交通大学第一附属医院', region: '西北', level: '三甲' },
]

const productLines = [
  {
    id: 'robot',
    name: 'CT 引导穿刺导航机器人',
    shortName: '导航机器人',
    icon: 'CT',
    accent: 'orange',
    description: '适用于 CT 引导下穿刺、活检及消融路径规划。',
    quickProcedures: ['肺结节活检', '肝肿瘤穿刺', '椎体病灶活检'],
  },
  {
    id: 'ire',
    name: 'IRE 陡脉冲治疗系统',
    shortName: 'IRE',
    icon: 'IR',
    accent: 'charcoal',
    description: '适用于软组织消融及高精度能量释放。',
    quickProcedures: ['肝肿瘤 IRE', '胰腺病灶 IRE', '肾脏病灶 IRE'],
  },
  {
    id: 'rf-ablation',
    name: '射频消融治疗系统',
    shortName: '射频消融',
    icon: 'RF',
    accent: 'orange',
    description: '用于肿瘤、疼痛或静脉腔内闭合等场景。',
    quickProcedures: ['甲状腺结节消融', '肝肿瘤消融', '肺结节消融'],
  },
  {
    id: 'biopsy',
    name: '活检穿刺系统',
    shortName: '活检穿刺',
    icon: 'BX',
    accent: 'charcoal',
    description: '支持一次性针具、同轴活检针和导向套管。',
    quickProcedures: ['肺部活检', '肝脏活检', '淋巴结活检'],
  },
  {
    id: 'vein-rf',
    name: '静脉射频腔内闭合系统',
    shortName: '静脉闭合',
    icon: 'VN',
    accent: 'orange',
    description: '面向静脉曲张治疗与腔内热闭合。',
    quickProcedures: ['大隐静脉闭合', '小隐静脉闭合', '穿通支闭合'],
  },
  {
    id: 'electrosurgical',
    name: '高频电刀系统',
    shortName: '高频电刀',
    icon: 'ES',
    accent: 'charcoal',
    description: '覆盖切割、凝血和术中能量管理。',
    quickProcedures: ['开放手术', '腹腔镜手术', '门诊小手术'],
  },
  {
    id: 'neuro',
    name: '神经热凝治疗系统',
    shortName: '神经热凝',
    icon: 'NT',
    accent: 'orange',
    description: '用于疼痛科神经阻滞与热凝治疗。',
    quickProcedures: ['三叉神经痛', '腰椎小关节痛', '交感神经热凝'],
  },
]

const devices = [
  {
    id: 'dev-ctnav-pro',
    productLineId: 'robot',
    modelName: 'CT-Nav Pro 导航机器人',
    category: '导航机器人',
    snPrefix: 'CTN',
    parameterSchema: [
      { key: 'plannedDepth', label: '计划进针深度', unit: 'mm', placeholder: '82', min: 0, max: 300 },
      { key: 'needleAngle', label: '进针角度', unit: '°', placeholder: '26', min: 0, max: 90 },
      { key: 'scanCount', label: '扫描次数', unit: '次', placeholder: '3', min: 0, max: 20 },
    ],
    defaultConsumables: ['定位针', '穿刺针', '导向架'],
  },
  {
    id: 'dev-ire-2000',
    productLineId: 'ire',
    modelName: 'IRE-2000 陡脉冲治疗系统',
    category: 'IRE',
    snPrefix: 'IRE',
    parameterSchema: [
      { key: 'outputPower', label: '输出功率', unit: 'W', placeholder: '90', min: 0, max: 300 },
      { key: 'pulseCount', label: '脉冲次数', unit: '次', placeholder: '90', min: 0, max: 300 },
      { key: 'duration', label: '作用时长', unit: 'min', placeholder: '25', min: 0, max: 240 },
    ],
    defaultConsumables: ['IRE 电极针', '连接线', '一次性无菌罩'],
  },
  {
    id: 'dev-rf-90',
    productLineId: 'rf-ablation',
    modelName: 'RF-90 射频消融主机',
    category: '射频消融',
    snPrefix: 'RF',
    parameterSchema: [
      { key: 'outputPower', label: '输出功率', unit: 'W', placeholder: '65', min: 0, max: 200 },
      { key: 'targetTemp', label: '靶温', unit: '°C', placeholder: '90', min: 0, max: 120 },
      { key: 'duration', label: '维持时长', unit: 's', placeholder: '120', min: 0, max: 600 },
    ],
    defaultConsumables: ['射频针', '对极板', '连接导线'],
  },
  {
    id: 'dev-biopsy-core',
    productLineId: 'biopsy',
    modelName: 'CoreBx 活检穿刺系统',
    category: '活检穿刺',
    snPrefix: 'CBX',
    parameterSchema: [
      { key: 'needleGauge', label: '针径规格', unit: 'G', placeholder: '18', min: 10, max: 25 },
      { key: 'sampleCount', label: '取样次数', unit: '次', placeholder: '2', min: 1, max: 10 },
      { key: 'depth', label: '穿刺深度', unit: 'mm', placeholder: '72', min: 0, max: 250 },
    ],
    defaultConsumables: ['活检针', '同轴针', '标本盒'],
  },
  {
    id: 'dev-vein-close',
    productLineId: 'vein-rf',
    modelName: 'VeinClose 静脉闭合系统',
    category: '静脉射频',
    snPrefix: 'VCL',
    parameterSchema: [
      { key: 'segmentLength', label: '闭合段长', unit: 'cm', placeholder: '7', min: 0, max: 20 },
      { key: 'cycleCount', label: '闭合周期', unit: '次', placeholder: '6', min: 0, max: 30 },
      { key: 'targetTemp', label: '工作温度', unit: '°C', placeholder: '120', min: 60, max: 140 },
    ],
    defaultConsumables: ['静脉闭合导管', '鞘管', '超声耦合剂'],
  },
  {
    id: 'dev-es-300',
    productLineId: 'electrosurgical',
    modelName: 'ES-300 高频电刀',
    category: '高频电刀',
    snPrefix: 'ES',
    parameterSchema: [
      { key: 'cutPower', label: '切割功率', unit: 'W', placeholder: '80', min: 0, max: 300 },
      { key: 'coagPower', label: '凝血功率', unit: 'W', placeholder: '45', min: 0, max: 200 },
      { key: 'modeCount', label: '启用模式', unit: '个', placeholder: '2', min: 1, max: 10 },
    ],
    defaultConsumables: ['电刀笔', '负极板', '脚踏开关'],
  },
  {
    id: 'dev-neuro-therm',
    productLineId: 'neuro',
    modelName: 'NeuroTherm 神经热凝系统',
    category: '神经热凝',
    snPrefix: 'NT',
    parameterSchema: [
      { key: 'targetTemp', label: '靶温', unit: '°C', placeholder: '75', min: 0, max: 120 },
      { key: 'duration', label: '热凝时长', unit: 's', placeholder: '90', min: 0, max: 600 },
      { key: 'impedance', label: '阻抗', unit: 'Ω', placeholder: '320', min: 0, max: 2000 },
    ],
    defaultConsumables: ['热凝针', '刺激电极', '定位贴片'],
  },
]

const doctorSuggestions = ['朱海峰', '李颖', '陈莉', '杨博', '周玮', '刘晨']
const engineerOptions = ['王工', '李工', '周工', '陈工']
const quickOutcomes = ['参数稳定', '路径顺利', '闭合完成', '样本充足', '无设备报警']
const quickComplications = ['未见异常', '穿刺阻力偏大', '阻抗偏高', '温控波动', '图像复扫']
const statusOptions = ['待执行', '进行中', '已完成', '待同步']

const dashboardMetrics = [
  { id: 'today', label: '今日跟台', value: '6 场', helper: '2 场正在进行' },
  { id: 'month', label: '本月累计', value: '48 场', helper: 'CT 导航与消融占比最高' },
  { id: 'warning', label: '耗材预警', value: '4 项', helper: '射频针与活检针需要补货' },
  { id: 'sync', label: '已入库', value: '126 条', helper: '支持后续接 Supabase' },
]

const todayTasks = [
  {
    id: 'task-1',
    time: '08:30',
    hospital: '上海中医药大学附属龙华医院',
    doctor: '朱海峰',
    procedure: 'CT 导航肺结节活检',
    status: '进行中',
  },
  {
    id: 'task-2',
    time: '10:20',
    hospital: '北京协和医院',
    doctor: '李颖',
    procedure: 'IRE 胰腺病灶治疗',
    status: '待执行',
  },
  {
    id: 'task-3',
    time: '14:00',
    hospital: '武汉大学中南医院',
    doctor: '周玮',
    procedure: '神经热凝疼痛治疗',
    status: '待确认',
  },
]

const recentCases = [
  {
    id: 'case-20260422-001',
    hospital: '重庆市肿瘤医院',
    doctor: '刘晨',
    device: 'IRE-2000 陡脉冲治疗系统',
    productLine: 'IRE 陡脉冲治疗系统',
    status: '已完成',
    summary: '双针通道建立顺利，术中参数稳定。',
    updatedAt: '2026-04-22T09:20:00+08:00',
  },
  {
    id: 'case-20260421-014',
    hospital: '广州医科大学附属第一医院',
    doctor: '陈莉',
    device: 'RF-90 射频消融主机',
    productLine: '射频消融治疗系统',
    status: '进行中',
    summary: '第 2 阶段温控观察中，暂未见异常。',
    updatedAt: '2026-04-21T16:45:00+08:00',
  },
  {
    id: 'case-20260420-007',
    hospital: '上海中医药大学附属龙华医院',
    doctor: '杨博',
    device: 'CT-Nav Pro 导航机器人',
    productLine: 'CT 引导穿刺导航机器人',
    status: '已完成',
    summary: '定位准确，已完成病灶取样与复扫。',
    updatedAt: '2026-04-20T18:10:00+08:00',
  },
]

const moduleRoadmap = [
  {
    id: 'capture',
    title: '产品化跟台录入',
    description: '按产品线选择模板，动态生成参数区和耗材建议，尽量少打字。',
  },
  {
    id: 'database',
    title: '病例数据库',
    description: '当前版本支持写入本地病例库，下一步可直接切换到 Supabase。',
  },
  {
    id: 'dashboard',
    title: '管理驾驶舱',
    description: '按产品、医院、区域、医生和耗材维度查看病例趋势。',
  },
  {
    id: 'ocr',
    title: 'OCR / 扫码扩展',
    description: '为耗材批号、排班单、病灶信息预留图像识别入口。',
  },
]

const schemaHighlights = [
  { table: 'users', columns: 'id, name, role, department, region' },
  { table: 'hospitals', columns: 'id, name, region, level' },
  { table: 'devices', columns: 'id, model_name, category, sn_prefix, parameter_schema' },
  { table: 'clinical_cases', columns: 'id, case_date, hospital_id, doctor_name, engineer_id, status' },
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

function createEmptyConsumable(name = '') {
  return {
    id: createEntryId('consumable'),
    itemName: name,
    quantity: 1,
    batchNo: '',
  }
}

function getDevicesByProductLine(productLineId) {
  return devices.filter((device) => device.productLineId === productLineId)
}

function getDefaultDeviceForProductLine(productLineId) {
  return getDevicesByProductLine(productLineId)[0] ?? devices[0]
}

function createDefaultCaseDraft() {
  const defaultProductLine = productLines[0]
  const defaultDevice = getDefaultDeviceForProductLine(defaultProductLine.id)

  return {
    caseDate: formatDateInput(),
    hospitalId: hospitals[0].id,
    doctorName: doctorSuggestions[0],
    surgeryType: defaultProductLine.quickProcedures[0],
    engineerName: engineerOptions[0],
    productLineId: defaultProductLine.id,
    deviceId: defaultDevice.id,
    status: statusOptions[0],
    notes: '',
    abnormal: false,
    outcome: quickOutcomes[0],
    complications: quickComplications[0],
    parameters: {},
    attachments: [],
    consumables: defaultDevice.defaultConsumables.slice(0, 2).map((item) => createEmptyConsumable(item)),
  }
}

export {
  createDefaultCaseDraft,
  createEmptyConsumable,
  createEntryId,
  dashboardMetrics,
  devices,
  doctorSuggestions,
  engineerOptions,
  getDefaultDeviceForProductLine,
  getDevicesByProductLine,
  hospitals,
  moduleRoadmap,
  productLines,
  quickComplications,
  quickOutcomes,
  recentCases,
  schemaHighlights,
  statusOptions,
  todayTasks,
}
