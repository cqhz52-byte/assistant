import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  createDefaultCaseDraft,
  createEmptyConsumable,
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
} from './lib/clinicalData'
import {
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
} from './lib/caseSupportService'
import { loadDraft, removeDraft, saveDraft } from './lib/offlineStore'

const DRAFT_KEY = 'active-clinical-case'

const steps = [
  { id: 'product', label: '产品与医院', hint: '优先使用卡片和快捷项，尽量少输入文字。' },
  { id: 'params', label: '术中参数', hint: '根据产品自动切换参数模板。' },
  { id: 'consumables', label: '耗材追踪', hint: '支持模板套用与批号补录。' },
  { id: 'summary', label: '总结归档', hint: '提交到公司内部病例数据库。' },
]

const hospitalRegions = ['全部', '华北', '东北', '华东', '中南', '西南', '西北', '全国']

function formatDateTime(value) {
  if (!value) return '未保存'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '刚刚'

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatHospitalMeta(hospital) {
  const location = [hospital.province, hospital.city].filter(Boolean)
  const uniqueLocation = location.filter((item, index) => location.indexOf(item) === index)
  return [...uniqueLocation, hospital.region, hospital.level].filter(Boolean).join(' · ')
}

function getHospitalById(id) {
  return hospitals.find((item) => item.id === id) ?? hospitals[0]
}

function getProductLineById(id) {
  return productLines.find((item) => item.id === id) ?? productLines[0]
}

function getDeviceById(id) {
  return devices.find((item) => item.id === id) ?? devices[0]
}

function buildParameterState(device, existingValues = {}) {
  return device.parameterSchema.reduce((result, parameter) => {
    result[parameter.key] = existingValues[parameter.key] ?? ''
    return result
  }, {})
}

function withDevicePreset(draft) {
  const productLine = getProductLineById(draft.productLineId)
  const device = getDeviceById(draft.deviceId)

  return {
    ...draft,
    surgeryType: draft.surgeryType || productLine.quickProcedures[0],
    parameters: buildParameterState(device, draft.parameters),
    consumables:
      Array.isArray(draft.consumables) && draft.consumables.length > 0
        ? draft.consumables
        : device.defaultConsumables.slice(0, 2).map((item) => createEmptyConsumable(item)),
  }
}

function normalizeDraft(draft, profileName = '') {
  const base = createDefaultCaseDraft()
  const merged = {
    ...base,
    ...draft,
    engineerName: draft?.engineerName || profileName || base.engineerName,
    attachments: Array.isArray(draft?.attachments) ? draft.attachments : [],
    consumables:
      Array.isArray(draft?.consumables) && draft.consumables.length > 0
        ? draft.consumables
        : base.consumables,
  }

  return withDevicePreset(merged)
}

function toCaseCard(caseItem) {
  return {
    id: caseItem.id,
    hospital: caseItem.hospitalName,
    doctor: caseItem.doctorName,
    device: caseItem.deviceName,
    productLine: caseItem.productLineName,
    status: caseItem.status,
    summary: caseItem.outcome || caseItem.notes || '已提交病例记录。',
    updatedAt: caseItem.updatedAt || caseItem.createdAt,
  }
}

function AuthScreen({
  authMode,
  authForm,
  authMessage,
  authPending,
  onChange,
  onSubmit,
  onToggleMode,
  onUseDemoAccount,
}) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <img src="/curaway-logo.jpg" alt="Curaway" className="auth-logo" />
          <p className="eyebrow">Internal Server Login</p>
          <h1>登录伽奈维临床跟台系统</h1>
          <p className="hero-text">
            病例、耗材与图片索引将写入公司内部服务器。首次使用可直接注册工程师账号。
          </p>
        </div>

        {authMessage ? <div className="notice-banner">{authMessage}</div> : null}
        <div className="notice-banner">
          演示模式可直接登录：
          <strong> {demoCredentials.email} </strong>
          / <strong>{demoCredentials.password}</strong>
          <button type="button" className="ghost-button demo-fill-button" onClick={onUseDemoAccount}>
            一键填入演示账号
          </button>
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          {authMode === 'signup' ? (
            <label className="field">
              <span>姓名</span>
              <input
                value={authForm.name}
                onChange={(event) => onChange('name', event.target.value)}
                placeholder="例如：王工程师"
              />
            </label>
          ) : null}

          <label className="field">
            <span>邮箱</span>
            <input
              type="email"
              value={authForm.email}
              onChange={(event) => onChange('email', event.target.value)}
              placeholder="name@curaway.com"
            />
          </label>

          <label className="field">
            <span>密码</span>
            <input
              type="password"
              value={authForm.password}
              onChange={(event) => onChange('password', event.target.value)}
              placeholder="至少 8 位"
            />
          </label>

          {authMode === 'signup' ? (
            <div className="selector-block compact-block">
              <div className="block-title">
                <strong>角色</strong>
                <span>注册后会进入公司内部用户库。</span>
              </div>
              <div className="chip-row">
                {[
                  { id: 'engineer', label: '工程师' },
                  { id: 'admin', label: '管理员' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`chip ${authForm.role === item.id ? 'active' : ''}`}
                    onClick={() => onChange('role', item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="auth-actions">
            <button type="submit" className="primary-button" disabled={authPending}>
              {authPending ? '处理中...' : authMode === 'signin' ? '登录并进入系统' : '注册并进入系统'}
            </button>
            <button type="button" className="ghost-button" onClick={onToggleMode}>
              {authMode === 'signin' ? '没有账号？去注册' : '已有账号？去登录'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

function App() {
  const [view, setView] = useState('dashboard')
  const [stepIndex, setStepIndex] = useState(0)
  const [formState, setFormState] = useState(() => normalizeDraft(null))
  const [hospitalKeyword, setHospitalKeyword] = useState('')
  const [hospitalRegion, setHospitalRegion] = useState('全部')
  const [hospitalProvince, setHospitalProvince] = useState('全部省份')
  const [notice, setNotice] = useState('')
  const [saveState, setSaveState] = useState('loading')
  const [lastSavedAt, setLastSavedAt] = useState('')
  const [isHydrated, setIsHydrated] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [recentCaseList, setRecentCaseList] = useState(recentCases)
  const [caseStats, setCaseStats] = useState({
    totalCases: recentCases.length,
    completedCases: recentCases.filter((item) => item.status === '已完成').length,
    pendingSync: recentCases.filter((item) => item.status === '待同步').length,
  })
  const [authReady, setAuthReady] = useState(false)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authMode, setAuthMode] = useState('signin')
  const [authPending, setAuthPending] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'engineer',
  })
  const [loadedUserKey, setLoadedUserKey] = useState('')
  const demoMode = isDemoSession(session)

  const selectedHospital = useMemo(() => getHospitalById(formState.hospitalId), [formState.hospitalId])
  const selectedProductLine = useMemo(
    () => getProductLineById(formState.productLineId),
    [formState.productLineId],
  )
  const devicesForLine = useMemo(
    () => getDevicesByProductLine(formState.productLineId),
    [formState.productLineId],
  )
  const selectedDevice = useMemo(() => getDeviceById(formState.deviceId), [formState.deviceId])

  const featuredHospitals = useMemo(
    () => hospitals.filter((item) => item.featured).slice(0, 12),
    [],
  )

  const hospitalProvinceOptions = useMemo(
    () => ['全部省份', ...new Set(hospitals.map((hospital) => hospital.province).filter(Boolean))],
    [],
  )

  const filteredHospitals = useMemo(() => {
    const keyword = hospitalKeyword.trim().toLowerCase()
    const regionMatched =
      hospitalRegion === '全部'
        ? hospitals
        : hospitals.filter((hospital) => hospital.region === hospitalRegion)
    const provinceMatched =
      hospitalProvince === '全部省份'
        ? regionMatched
        : regionMatched.filter((hospital) => hospital.province === hospitalProvince)

    if (!keyword) return provinceMatched

    return provinceMatched.filter((hospital) => {
      const target = [
        hospital.name,
        hospital.province,
        hospital.provinceFullName,
        hospital.city,
        hospital.cityFullName,
        hospital.region,
        hospital.level,
        ...(hospital.aliases ?? []),
      ]
        .join(' ')
        .toLowerCase()
      return target.includes(keyword)
    })
  }, [hospitalKeyword, hospitalProvince, hospitalRegion])

  const visibleHospitals = useMemo(() => filteredHospitals.slice(0, 12), [filteredHospitals])

  const metrics = useMemo(
    () => [
      dashboardMetrics[0],
      {
        ...dashboardMetrics[1],
        value: `${caseStats.totalCases} 条`,
        helper: '公司内部服务器累计病例数',
      },
      {
        ...dashboardMetrics[2],
        value: `${selectedDevice.defaultConsumables.length} 类`,
        helper: '当前设备推荐耗材模板',
      },
      {
        ...dashboardMetrics[3],
        value: `${caseStats.pendingSync} 条`,
        helper: getModeLabel(),
      },
    ],
    [caseStats, selectedDevice.defaultConsumables.length],
  )

  useEffect(() => {
    let active = true

    async function initializeAuth() {
      try {
        const { session: nextSession } = await getCurrentSession()
        if (!active) return

        setSession(nextSession)

        if (nextSession) {
          const nextProfile = await getCurrentProfile()
          if (!active) return
          setProfile(nextProfile)
        }
      } catch (error) {
        if (!active) return
        setNotice(formatErrorMessage(error, '初始化登录状态失败。'))
      } finally {
        if (active) setAuthReady(true)
      }
    }

    initializeAuth()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const userKey = session?.user?.id ?? ''
    if (!authReady || !session || !profile?.id || loadedUserKey === userKey) return

    let active = true

    async function bootstrapApp() {
      try {
        const [draft, bootstrapData] = await Promise.all([loadDraft(DRAFT_KEY), getCaseSupportBootstrap()])
        if (!active) return

        const nextDraft = normalizeDraft(draft, profile?.name || demoProfile.name)
        const draftHospital = nextDraft.hospitalId ? getHospitalById(nextDraft.hospitalId) : null
        setFormState(nextDraft)
        setHospitalKeyword('')
        setHospitalRegion('全部')
        setHospitalProvince(draftHospital?.province ?? '全部省份')
        setLastSavedAt(draft?.savedAt ?? '')

        if (draft) {
          setView('form')
          setNotice('已恢复上次未完成的跟台草稿。')
        }

        if (bootstrapData?.cases?.length) {
          setRecentCaseList(bootstrapData.cases.map(toCaseCard).slice(0, 6))
          setCaseStats({
            totalCases: bootstrapData.totalCases ?? bootstrapData.cases.length,
            completedCases: bootstrapData.completedCases ?? 0,
            pendingSync: bootstrapData.pendingSync ?? 0,
          })
        }

        setLoadedUserKey(userKey)
      } catch (error) {
        if (!active) return
        setNotice(formatErrorMessage(error, '读取病例数据失败。'))
      } finally {
        if (active) {
          setSaveState('idle')
          setIsHydrated(true)
        }
      }
    }

    bootstrapApp()

    return () => {
      active = false
    }
  }, [authReady, loadedUserKey, profile, session])

  useEffect(() => {
    if (!isHydrated) return

    const timeoutId = window.setTimeout(async () => {
      try {
        setSaveState('saving')
        await saveDraft(DRAFT_KEY, formState)
        setLastSavedAt(new Date().toISOString())
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [formState, isHydrated])

  function updateField(field, value) {
    setFormState((current) => ({ ...current, [field]: value }))
  }

  function updateParameter(key, value) {
    setFormState((current) => ({
      ...current,
      parameters: {
        ...current.parameters,
        [key]: value,
      },
    }))
  }

  function updateAuthField(field, value) {
    setAuthForm((current) => ({ ...current, [field]: value }))
  }

  function selectHospital(hospital) {
    setHospitalKeyword('')
    setHospitalRegion(hospital.region)
    setHospitalProvince(hospital.province)
    updateField('hospitalId', hospital.id)
  }

  function selectProductLine(productLineId) {
    const productLine = getProductLineById(productLineId)
    const nextDevice = getDefaultDeviceForProductLine(productLineId)

    setFormState((current) =>
      withDevicePreset({
        ...current,
        productLineId,
        deviceId: nextDevice.id,
        surgeryType: productLine.quickProcedures[0],
        parameters: {},
        consumables: [],
      }),
    )
  }

  function selectDevice(deviceId) {
    setFormState((current) =>
      withDevicePreset({
        ...current,
        deviceId,
        parameters: current.parameters,
        consumables:
          current.consumables.length > 0
            ? current.consumables
            : getDeviceById(deviceId).defaultConsumables
                .slice(0, 2)
                .map((item) => createEmptyConsumable(item)),
      }),
    )
  }

  function addConsumable(name = '') {
    setFormState((current) => ({
      ...current,
      consumables: [...current.consumables, createEmptyConsumable(name)],
    }))
  }

  function updateConsumable(index, field, value) {
    setFormState((current) => ({
      ...current,
      consumables: current.consumables.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }))
  }

  function removeConsumable(index) {
    setFormState((current) => ({
      ...current,
      consumables:
        current.consumables.length === 1
          ? current.consumables
          : current.consumables.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  function fillDeviceConsumables() {
    setFormState((current) => ({
      ...current,
      consumables: selectedDevice.defaultConsumables.map((item) => createEmptyConsumable(item)),
    }))
  }

  function handleAttachmentChange(event) {
    const files = Array.from(event.target.files ?? [])
    const attachments = files.map((file) => ({
      name: file.name,
      size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      type: file.type || 'image/*',
      fileUrl: '',
    }))

    setFormState((current) => ({
      ...current,
      attachments,
    }))
  }

  async function clearDraftState() {
    const nextDraft = normalizeDraft(null, profile?.name || demoProfile.name)
    setFormState(nextDraft)
    setHospitalKeyword('')
    setHospitalRegion('全部')
    setHospitalProvince('全部省份')
    setStepIndex(0)
    setNotice('已清空草稿并恢复默认模板。')
    setLastSavedAt('')
    setSaveState('idle')
    await removeDraft(DRAFT_KEY)
  }

  function validateCurrentStep() {
    if (stepIndex === 0) {
      if (!formState.hospitalId || !formState.doctorName || !formState.deviceId) {
        setNotice('请先完整选择医院、医生和设备。')
        return false
      }
    }
    return true
  }

  function goNextStep() {
    if (!validateCurrentStep()) return
    setNotice('')
    setStepIndex((current) => Math.min(current + 1, steps.length - 1))
  }

  function goPreviousStep() {
    setNotice('')
    setStepIndex((current) => Math.max(current - 1, 0))
  }

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setAuthPending(true)
    setAuthMessage('')

    try {
      if (authMode === 'signin') {
        const nextSession = await signInWithPassword(authForm.email, authForm.password)
        setSession(nextSession)
        setProfile(nextSession.user)
        setAuthMessage('登录成功，正在进入系统。')
      } else {
        const nextSession = await signUpWithPassword(authForm)
        setSession(nextSession)
        setProfile(nextSession.user)
        setAuthMessage('注册成功，已自动登录。')
      }
    } catch (error) {
      setAuthMessage(formatErrorMessage(error, '认证失败，请稍后重试。'))
    } finally {
      setAuthPending(false)
    }
  }

  async function handleLogout() {
    try {
      await signOut()
      setSession(null)
      setProfile(null)
      setLoadedUserKey('')
      setAuthMessage('')
      setNotice('已退出登录。')
    } catch (error) {
      setNotice(formatErrorMessage(error, '退出登录失败。'))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!formState.hospitalId || !formState.doctorName || !formState.deviceId) {
      setNotice('请先完成基础信息。')
      setStepIndex(0)
      return
    }

    const payload = {
      ...formState,
      hospitalName: selectedHospital.name,
      productLineName: selectedProductLine.name,
      deviceName: selectedDevice.modelName,
    }

    try {
      setIsSubmitting(true)
      const result = await createCaseRecord(payload)
      const createdCase = toCaseCard(result.case)
      setRecentCaseList((current) => [createdCase, ...current].slice(0, 6))
      setCaseStats((current) => ({
        totalCases: result.totalCases ?? current.totalCases + 1,
        completedCases:
          result.case.status === '已完成' ? current.completedCases + 1 : current.completedCases,
        pendingSync:
          result.case.status === '待同步' ? current.pendingSync + 1 : current.pendingSync,
      }))

      await removeDraft(DRAFT_KEY)
      const nextDraft = normalizeDraft(null, profile?.name || demoProfile.name)
      setFormState(nextDraft)
      setHospitalKeyword('')
      setHospitalRegion('全部')
      setHospitalProvince('全部省份')
      setView('dashboard')
      setStepIndex(0)
      setLastSavedAt('')
      setSaveState('idle')
      setNotice('病例已写入公司内部服务器。')
    } catch (error) {
      setNotice(formatErrorMessage(error, '提交病例失败，请检查网络或服务器。'))
    } finally {
      setIsSubmitting(false)
    }
  }

  function renderProductStep() {
    return (
      <div className="content-split">
        <section className="surface-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Step 1</p>
              <h3>产品与医院</h3>
            </div>
            <span className="mini-pill">尽量使用快捷项</span>
          </div>

          <div className="selector-block compact-product-block">
            <div className="block-title">
              <strong>产品系统</strong>
              <span>改为紧凑选择，减少页面占用。</span>
            </div>

            <label className="field">
              <span>选择产品线</span>
              <select
                value={formState.productLineId}
                onChange={(event) => selectProductLine(event.target.value)}
              >
                {productLines.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="compact-selection-card">
              <span className="product-icon">{selectedProductLine.icon}</span>
              <div>
                <strong>{selectedProductLine.name}</strong>
                <p>{selectedProductLine.description}</p>
              </div>
            </div>
          </div>

          <div className="selector-block">
              <div className="block-title">
                <strong>医院</strong>
                <span>独立医院数据库文件，支持热门医院一键选、区域筛选和跨省市搜索</span>
              </div>

              <div className="selector-block compact-block">
                <div className="block-title">
                  <strong>热门医院</strong>
                  <span>不输入也可以直接点击常用头部医院</span>
                </div>
                <div className="chip-row">
                  {featuredHospitals.map((hospital) => (
                    <button
                      key={hospital.id}
                      type="button"
                      className={`chip ${formState.hospitalId === hospital.id ? 'active' : ''}`}
                      onClick={() => selectHospital(hospital)}
                    >
                      {hospital.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="selector-block compact-block">
                <div className="block-title">
                  <strong>区域筛选</strong>
                  <span>先按区域和省份缩小范围，再从医院库快速选择</span>
                </div>
                <div className="chip-row">
                  {hospitalRegions.map((region) => (
                    <button
                      key={region}
                      type="button"
                      className={`chip ${hospitalRegion === region ? 'active' : ''}`}
                      onClick={() => setHospitalRegion(region)}
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field-row">
                <label className="field">
                  <span>省份</span>
                  <select
                    value={hospitalProvince}
                    onChange={(event) => setHospitalProvince(event.target.value)}
                  >
                    {hospitalProvinceOptions.map((province) => (
                      <option key={province} value={province}>
                        {province}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>搜索医院</span>
                  <input
                    value={hospitalKeyword}
                    onChange={(event) => setHospitalKeyword(event.target.value)}
                    placeholder="例如：协和 / 华西 / 瑞金 / 浙江 / 广州 / 三甲"
                  />
                </label>
              </div>

              <div className="search-result-meta">
                <span>匹配 {filteredHospitals.length} 家医院</span>
                {filteredHospitals.length > visibleHospitals.length ? (
                  <span>当前仅展示前 {visibleHospitals.length} 家</span>
                ) : null}
            </div>

            <div className="hospital-list">
              {visibleHospitals.length === 0 ? (
                <div className="empty-search-state">未找到匹配医院，请换个关键词再试。</div>
              ) : (
                visibleHospitals.map((hospital) => (
                  <button
                    key={hospital.id}
                    type="button"
                    className={`selector-card ${
                      formState.hospitalId === hospital.id ? 'selected' : ''
                    }`}
                      onClick={() => selectHospital(hospital)}
                    >
                      <strong>{hospital.name}</strong>
                      <span>{formatHospitalMeta(hospital)}</span>
                    </button>
                  ))
              )}
            </div>
          </div>

          <div className="selector-block">
            <div className="block-title">
              <strong>快捷选择</strong>
              <span>医生、工程师和术式优先使用按钮，减少打字。</span>
            </div>
            <div className="chip-row">
              {doctorSuggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`chip ${formState.doctorName === item ? 'active' : ''}`}
                  onClick={() => updateField('doctorName', item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="chip-row">
              {engineerOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`chip ${formState.engineerName === item ? 'active' : ''}`}
                  onClick={() => updateField('engineerName', item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="chip-row">
              {selectedProductLine.quickProcedures.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`chip ${formState.surgeryType === item ? 'active' : ''}`}
                  onClick={() => updateField('surgeryType', item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="selector-block">
            <div className="block-title">
              <strong>设备型号</strong>
              <span>按产品线自动筛选</span>
            </div>
            <div className="selector-grid">
              {devicesForLine.map((device) => (
                <button
                  key={device.id}
                  type="button"
                  className={`selector-card ${formState.deviceId === device.id ? 'selected' : ''}`}
                  onClick={() => selectDevice(device.id)}
                >
                  <strong>{device.modelName}</strong>
                  <span>
                    {device.category} · SN 前缀 {device.snPrefix}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="surface-card side-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Preset</p>
              <h3>当前模板摘要</h3>
            </div>
          </div>

          <dl className="summary-list">
            <div>
              <dt>医院</dt>
              <dd>{selectedHospital.name}</dd>
            </div>
            <div>
              <dt>医生</dt>
              <dd>{formState.doctorName}</dd>
            </div>
            <div>
              <dt>产品</dt>
              <dd>{selectedProductLine.name}</dd>
            </div>
            <div>
              <dt>设备</dt>
              <dd>{selectedDevice.modelName}</dd>
            </div>
            <div>
              <dt>录入模式</dt>
              <dd>{getModeLabel()}</dd>
            </div>
          </dl>
        </section>
      </div>
    )
  }

  function renderParameterStep() {
    return (
      <div className="content-split">
        <section className="surface-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Step 2</p>
              <h3>术中参数</h3>
            </div>
            <span className="mini-pill">{selectedDevice.modelName}</span>
          </div>

          <div className="parameter-grid">
            {selectedDevice.parameterSchema.map((parameter) => (
              <label key={parameter.key} className="field">
                <span>
                  {parameter.label} ({parameter.unit})
                </span>
                <input
                  type="number"
                  min={parameter.min}
                  max={parameter.max}
                  placeholder={parameter.placeholder}
                  value={formState.parameters[parameter.key] ?? ''}
                  onChange={(event) => updateParameter(parameter.key, event.target.value)}
                />
              </label>
            ))}
          </div>

          <div className="selector-block">
            <div className="block-title">
              <strong>病例状态</strong>
              <span>状态会进入病例统计。</span>
            </div>
            <div className="chip-row">
              {statusOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`chip ${formState.status === item ? 'active' : ''}`}
                  onClick={() => updateField('status', item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="switch-card">
            <div>
              <strong>是否异常</strong>
              <p className="hero-text">如存在报警、阻抗异常或穿刺困难，可打开异常开关。</p>
            </div>
            <button
              type="button"
              className={`switch ${formState.abnormal ? 'on' : ''}`}
              onClick={() => updateField('abnormal', !formState.abnormal)}
            >
              <span />
            </button>
          </div>

          <label className="field">
            <span>术中备注</span>
            <textarea
              rows="4"
              value={formState.notes}
              onChange={(event) => updateField('notes', event.target.value)}
              placeholder="记录 CT 复扫、能量释放、针道调整等关键信息"
            />
          </label>
        </section>

        <section className="surface-card side-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Hints</p>
              <h3>设备建议</h3>
            </div>
          </div>

          <div className="tip-card strong">
            <strong>推荐术式</strong>
            <p>{selectedProductLine.quickProcedures.join(' / ')}</p>
          </div>

          <div className="tip-card">
            <strong>推荐耗材</strong>
            <p>{selectedDevice.defaultConsumables.join(' / ')}</p>
          </div>
        </section>
      </div>
    )
  }

  function renderConsumablesStep() {
    return (
      <div className="content-split">
        <section className="surface-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Step 3</p>
              <h3>耗材追踪</h3>
            </div>
            <button type="button" className="ghost-button" onClick={fillDeviceConsumables}>
              一键套用设备模板
            </button>
          </div>

          <div className="chip-row">
            {selectedDevice.defaultConsumables.map((item) => (
              <button key={item} type="button" className="chip" onClick={() => addConsumable(item)}>
                + {item}
              </button>
            ))}
          </div>

          <div className="consumable-list">
            {formState.consumables.map((item, index) => (
              <div key={item.id} className="consumable-card">
                <div className="field-row">
                  <label className="field">
                    <span>耗材名称</span>
                    <input
                      value={item.itemName}
                      onChange={(event) => updateConsumable(index, 'itemName', event.target.value)}
                      placeholder="例如：射频针"
                    />
                  </label>
                  <label className="field compact">
                    <span>数量</span>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) => updateConsumable(index, 'quantity', event.target.value)}
                    />
                  </label>
                </div>

                <label className="field">
                  <span>批号 / Batch No.</span>
                  <input
                    value={item.batchNo}
                    onChange={(event) => updateConsumable(index, 'batchNo', event.target.value)}
                    placeholder="支持后续扫码录入"
                  />
                </label>

                <div className="inline-actions">
                  <span className="mini-pill">拍照 / OCR 入口预留</span>
                  <button type="button" className="text-button" onClick={() => removeConsumable(index)}>
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-card side-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Capture</p>
              <h3>图片占位</h3>
            </div>
          </div>

          <label className="upload-panel">
            <input type="file" accept="image/*" capture="environment" onChange={handleAttachmentChange} />
            <strong>拍摄耗材标签</strong>
            <p>可先记录图片元数据，后续再接扫码识别或对象存储上传。</p>
          </label>

          <div className="tip-card strong">
            <strong>推荐模板</strong>
            <p>{selectedDevice.defaultConsumables.join(' / ')}</p>
          </div>
        </section>
      </div>
    )
  }

  function renderSummaryStep() {
    return (
      <div className="content-split">
        <section className="surface-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Step 4</p>
              <h3>总结与归档</h3>
            </div>
            <span className="mini-pill">提交到公司内部数据库</span>
          </div>

          <div className="selector-block">
            <div className="block-title">
              <strong>术后结果</strong>
            </div>
            <div className="chip-row">
              {quickOutcomes.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`chip ${formState.outcome === item ? 'active' : ''}`}
                  onClick={() => updateField('outcome', item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span>结果补充</span>
            <textarea
              rows="3"
              value={formState.outcome}
              onChange={(event) => updateField('outcome', event.target.value)}
              placeholder="补充医生结论、定位效果或治疗反馈"
            />
          </label>

          <div className="selector-block">
            <div className="block-title">
              <strong>并发症 / 特殊情况</strong>
            </div>
            <div className="chip-row">
              {quickComplications.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`chip ${formState.complications === item ? 'active' : ''}`}
                  onClick={() => updateField('complications', item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span>特殊情况补充</span>
            <textarea
              rows="3"
              value={formState.complications}
              onChange={(event) => updateField('complications', event.target.value)}
              placeholder="如无，可保留“未见异常”"
            />
          </label>

          <label className="upload-panel large">
            <input type="file" accept="image/*,video/*" multiple onChange={handleAttachmentChange} />
            <strong>上传现场图片 / 视频</strong>
            <p>当前记录文件名、大小与类型，后续可接公司对象存储或 NAS。</p>
          </label>

          <div className="attachment-list">
            {formState.attachments.length === 0 ? (
              <p className="muted-text">尚未选择附件。</p>
            ) : (
              formState.attachments.map((file) => (
                <div key={`${file.name}-${file.size}`} className="attachment-item">
                  <strong>{file.name}</strong>
                  <span>
                    {file.size} · {file.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="surface-card side-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Review</p>
              <h3>提交摘要</h3>
            </div>
          </div>

          <dl className="summary-list">
            <div>
              <dt>医院</dt>
              <dd>{selectedHospital.name}</dd>
            </div>
            <div>
              <dt>产品</dt>
              <dd>{selectedProductLine.name}</dd>
            </div>
            <div>
              <dt>设备</dt>
              <dd>{selectedDevice.modelName}</dd>
            </div>
            <div>
              <dt>耗材</dt>
              <dd>{formState.consumables.length} 项</dd>
            </div>
            <div>
              <dt>附件</dt>
              <dd>{formState.attachments.length} 个</dd>
            </div>
          </dl>

          <div className="tip-card">
            <strong>草稿状态</strong>
            <p>{saveState === 'saving' ? '正在自动保存草稿' : `最近保存：${formatDateTime(lastSavedAt)}`}</p>
          </div>
        </section>
      </div>
    )
  }

  function renderCurrentStep() {
    if (stepIndex === 0) return renderProductStep()
    if (stepIndex === 1) return renderParameterStep()
    if (stepIndex === 2) return renderConsumablesStep()
    return renderSummaryStep()
  }

  if (!authReady) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <p className="eyebrow">Loading</p>
          <h1>正在初始化系统</h1>
          <p className="hero-text">正在检查公司服务器会话与病例数据，请稍候。</p>
        </section>
      </main>
    )
  }

  if (!session) {
    return (
      <AuthScreen
        authMode={authMode}
        authForm={authForm}
        authMessage={authMessage}
        authPending={authPending}
        onChange={updateAuthField}
        onSubmit={handleAuthSubmit}
        onUseDemoAccount={() => {
          setAuthMode('signin')
          setAuthForm((current) => ({
            ...current,
            email: demoCredentials.email,
            password: demoCredentials.password,
          }))
          setAuthMessage('已填入演示账号，可直接点击登录。')
        }}
        onToggleMode={() => {
          setAuthMode((current) => (current === 'signin' ? 'signup' : 'signin'))
          setAuthMessage('')
        }}
      />
    )
  }

  return (
    <div className="app-shell">
      <header className="hero-shell">
        <section className="brand-panel">
          <div className="brand-copy">
            <p className="eyebrow">Curaway Clinical Case Support</p>
            <h1>临床跟台工作台</h1>
            <p className="hero-text">
              录入界面已经切换到公司内部服务器架构。病例主数据保存在后端数据库，手机端继续保留本地草稿缓存，适合术中弱网环境。
            </p>
          </div>
          <div className="brand-logo-card">
            <img src="/curaway-logo.jpg" alt="Curaway" className="brand-logo" />
            <div className="status-ribbon">
              <span className={`status-dot ${saveState}`} />
              {saveState === 'saving' ? '草稿保存中' : getModeLabel()}
            </div>
          </div>
        </section>

        <section className="nav-panel">
          <div className="nav-tabs">
            <button
              type="button"
              className={`tab-button ${view === 'dashboard' ? 'active' : ''}`}
              onClick={() => setView('dashboard')}
            >
              工作台
            </button>
            <button
              type="button"
              className={`tab-button ${view === 'form' ? 'active' : ''}`}
              onClick={() => setView('form')}
            >
              新建跟台
            </button>
          </div>

          <div className="hero-side">
            <div className="hero-mini-stats">
              <div>
                <strong>{caseStats.totalCases}</strong>
                <span>病例总数</span>
              </div>
              <div>
                <strong>{caseStats.completedCases}</strong>
                <span>已完成</span>
              </div>
              <div>
                <strong>{caseStats.pendingSync}</strong>
                <span>待同步</span>
              </div>
            </div>

            <div className="account-card">
              <strong>{profile?.name || demoProfile.name}</strong>
              <span>{profile?.email}</span>
              <span>{profile?.role || demoProfile.role}</span>
              <button type="button" className="ghost-button" onClick={handleLogout}>
                退出登录
              </button>
            </div>
          </div>
        </section>
      </header>

      <div className="notice-banner">
        {demoMode
          ? '当前为演示模式，病例数据仅保存在当前浏览器，不会写入公司服务器。'
          : '当前接入公司服务器。默认本地开发地址为 `/api`，生产环境请将 `VITE_API_BASE_URL` 指向公司域名，例如 `https://case.yourcompany.com/api`。'}
      </div>

      {notice ? <div className="notice-banner">{notice}</div> : null}

      {view === 'dashboard' ? (
        <main className="dashboard-layout">
          <section className="metrics-grid">
            {metrics.map((item) => (
              <article key={item.id} className="metric-card">
                <p>{item.label}</p>
                <strong>{item.value}</strong>
                <span>{item.helper}</span>
              </article>
            ))}
          </section>

          <section className="dashboard-grid">
            <article className="surface-card">
              <div className="section-head">
                <div>
                  <p className="section-kicker">Today</p>
                  <h2>今日任务</h2>
                </div>
                <button type="button" className="primary-button" onClick={() => setView('form')}>
                  新建跟台记录
                </button>
              </div>

              <div className="task-list">
                {todayTasks.map((task) => (
                  <div key={task.id} className="task-item">
                    <div>
                      <strong>{task.procedure}</strong>
                      <p>
                        {task.hospital} · {task.doctor}
                      </p>
                    </div>
                    <span className="mini-pill">{task.status}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="surface-card">
              <div className="section-head">
                <div>
                  <p className="section-kicker">Products</p>
                  <h2>主要产品线</h2>
                </div>
              </div>

              <div className="product-summary-grid">
                {productLines.map((item) => (
                  <div key={item.id} className={`summary-product ${item.accent}`}>
                    <span>{item.icon}</span>
                    <strong>{item.shortName}</strong>
                    <p>{item.quickProcedures[0]}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="surface-card wide-card">
              <div className="section-head">
                <div>
                  <p className="section-kicker">Recent Cases</p>
                  <h2>最近病例</h2>
                </div>
              </div>

              <div className="case-list">
                {recentCaseList.slice(0, 4).map((item) => (
                  <div key={item.id} className="case-item">
                    <div>
                      <strong>{item.productLine}</strong>
                      <p>
                        {item.hospital} · {item.doctor}
                      </p>
                      <span>{item.summary}</span>
                    </div>
                    <div className="case-meta">
                      <span className="mini-pill">{item.status}</span>
                      <span>{formatDateTime(item.updatedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="surface-card">
              <div className="section-head">
                <div>
                  <p className="section-kicker">Roadmap</p>
                  <h2>系统能力</h2>
                </div>
              </div>
              <div className="roadmap-list">
                {moduleRoadmap.map((item) => (
                  <div key={item.id} className="roadmap-card">
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="surface-card">
              <div className="section-head">
                <div>
                  <p className="section-kicker">Schema</p>
                  <h2>数据库表结构</h2>
                </div>
              </div>
              <div className="schema-list">
                {schemaHighlights.map((item) => (
                  <div key={item.table} className="schema-row">
                    <strong>{item.table}</strong>
                    <span>{item.columns}</span>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <button type="button" className="fab-button" onClick={() => setView('form')}>
            + 新建跟台
          </button>
        </main>
      ) : (
        <main className="form-layout">
          <section className="form-topbar">
            <div>
              <p className="section-kicker">Case Form</p>
              <h2>临床跟台录入</h2>
              <p className="muted-text">提交后写入公司内部服务器，术中草稿仍自动缓存到本地浏览器。</p>
            </div>
            <div className="topbar-actions">
              <button type="button" className="ghost-button" onClick={clearDraftState}>
                清空草稿
              </button>
              <span className="mini-pill">最近保存：{formatDateTime(lastSavedAt)}</span>
            </div>
          </section>

          <section className="stepper-row">
            {steps.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`step-item ${index === stepIndex ? 'active' : ''} ${
                  index < stepIndex ? 'done' : ''
                }`}
                onClick={() => setStepIndex(index)}
              >
                <span>{index + 1}</span>
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.hint}</p>
                </div>
              </button>
            ))}
          </section>

          <form className="form-card" onSubmit={handleSubmit}>
            {renderCurrentStep()}

            <div className="form-footer">
              <button type="button" className="ghost-button" onClick={() => setView('dashboard')}>
                返回工作台
              </button>
              <div className="footer-actions">
                <button type="button" className="ghost-button" onClick={goPreviousStep} disabled={stepIndex === 0}>
                  上一步
                </button>
                {stepIndex < steps.length - 1 ? (
                  <button type="button" className="primary-button" onClick={goNextStep}>
                    下一步
                  </button>
                ) : (
                  <button type="submit" className="primary-button" disabled={isSubmitting}>
                    {isSubmitting ? '提交中...' : '提交并入库'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </main>
      )}
    </div>
  )
}

export default App
