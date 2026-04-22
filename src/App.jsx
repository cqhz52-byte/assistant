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
import { createCaseRecord, getCaseSupportBootstrap } from './lib/api'
import { loadDraft, removeDraft, saveDraft } from './lib/offlineStore'

const DRAFT_KEY = 'active-clinical-case'

const steps = [
  { id: 'product', label: '产品与医院', hint: '选产品线、医院、医生' },
  { id: 'params', label: '术中参数', hint: '动态模板、状态、异常' },
  { id: 'consumables', label: '耗材追踪', hint: '模板添加、批号补录' },
  { id: 'summary', label: '总结归档', hint: '图片、结果、提交入库' },
]

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

function buildParameterState(device, existingValues = {}) {
  return device.parameterSchema.reduce((result, parameter) => {
    result[parameter.key] = existingValues[parameter.key] ?? ''
    return result
  }, {})
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

function normalizeDraft(draft) {
  const base = createDefaultCaseDraft()
  const merged = {
    ...base,
    ...draft,
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

function App() {
  const [view, setView] = useState('dashboard')
  const [stepIndex, setStepIndex] = useState(0)
  const [formState, setFormState] = useState(() => normalizeDraft(null))
  const [hospitalKeyword, setHospitalKeyword] = useState('')
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

  const filteredHospitals = useMemo(() => {
    const keyword = hospitalKeyword.trim().toLowerCase()
    if (!keyword) return hospitals

    return hospitals.filter((hospital) => {
      const target = `${hospital.name} ${hospital.region} ${hospital.level}`.toLowerCase()
      return target.includes(keyword)
    })
  }, [hospitalKeyword])

  const metrics = useMemo(
    () => [
      dashboardMetrics[0],
      { ...dashboardMetrics[1], value: `${caseStats.totalCases} 条`, helper: '病例数据已入库' },
      { ...dashboardMetrics[2], value: `${selectedDevice.defaultConsumables.length} 类`, helper: '当前设备建议耗材模板' },
      { ...dashboardMetrics[3], value: `${caseStats.pendingSync} 条`, helper: '待同步或补录的病例' },
    ],
    [caseStats, selectedDevice.defaultConsumables.length],
  )

  useEffect(() => {
    let active = true

    async function bootstrap() {
      try {
        const [draft, bootstrapData] = await Promise.all([
          loadDraft(DRAFT_KEY),
          getCaseSupportBootstrap().catch(() => null),
        ])

        if (!active) return

        if (draft) {
          const nextDraft = normalizeDraft(draft)
          setFormState(nextDraft)
          setHospitalKeyword(getHospitalById(nextDraft.hospitalId).name)
          setLastSavedAt(draft.savedAt ?? '')
          setView('form')
          setNotice('已恢复上次未完成的跟台草稿。')
        } else {
          setHospitalKeyword(getHospitalById(createDefaultCaseDraft().hospitalId).name)
        }

        if (bootstrapData?.cases?.length) {
          setRecentCaseList(bootstrapData.cases.map(toCaseCard).slice(0, 6))
          setCaseStats({
            totalCases: bootstrapData.totalCases,
            completedCases: bootstrapData.completedCases,
            pendingSync: bootstrapData.pendingSync,
          })
        }
      } finally {
        if (active) {
          setSaveState('idle')
          setIsHydrated(true)
        }
      }
    }

    bootstrap()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    const timeoutId = window.setTimeout(async () => {
      try {
        setSaveState('saving')
        await saveDraft(DRAFT_KEY, formState)
        setSaveState('saved')
        setLastSavedAt(new Date().toISOString())
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
    const device = getDeviceById(deviceId)
    setFormState((current) =>
      withDevicePreset({
        ...current,
        deviceId,
        parameters: current.parameters,
        consumables:
          current.consumables.length > 0
            ? current.consumables
            : device.defaultConsumables.slice(0, 2).map((item) => createEmptyConsumable(item)),
      }),
    )
  }

  function selectHospital(hospital) {
    setHospitalKeyword(hospital.name)
    updateField('hospitalId', hospital.id)
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
    }))

    setFormState((current) => ({
      ...current,
      attachments,
    }))
  }

  async function clearDraftState() {
    const nextDraft = normalizeDraft(null)
    setFormState(nextDraft)
    setHospitalKeyword(getHospitalById(nextDraft.hospitalId).name)
    setStepIndex(0)
    setNotice('已清空草稿并恢复默认模板。')
    setLastSavedAt('')
    setSaveState('idle')
    await removeDraft(DRAFT_KEY)
  }

  function validateCurrentStep() {
    if (stepIndex === 0) {
      if (!formState.hospitalId || !formState.doctorName || !formState.deviceId) {
        setNotice('请先完成医院、医生和设备选择。')
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

  async function handleSubmit(event) {
    event.preventDefault()

    if (!formState.hospitalId || !formState.doctorName || !formState.deviceId) {
      setNotice('请先完整填写基础信息。')
      setStepIndex(0)
      return
    }

    const payload = {
      ...formState,
      hospitalName: selectedHospital.name,
      productLineName: selectedProductLine.name,
      deviceName: selectedDevice.modelName,
      status: formState.status || '待同步',
    }

    try {
      setIsSubmitting(true)
      const result = await createCaseRecord(payload)
      const createdCase = toCaseCard(result.case)

      setRecentCaseList((current) => [createdCase, ...current].slice(0, 6))
      setCaseStats((current) => ({
        totalCases: result.totalCases,
        completedCases:
          result.case.status === '已完成' ? current.completedCases + 1 : current.completedCases,
        pendingSync:
          result.case.status === '待同步' ? current.pendingSync + 1 : current.pendingSync,
      }))

      await removeDraft(DRAFT_KEY)
      const nextDraft = normalizeDraft(null)
      setFormState(nextDraft)
      setHospitalKeyword(getHospitalById(nextDraft.hospitalId).name)
      setView('dashboard')
      setStepIndex(0)
      setSaveState('idle')
      setLastSavedAt('')
      setNotice('病例已成功写入数据库。')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '病例提交失败，请稍后重试。')
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
              <h3>先选产品线和医院</h3>
            </div>
            <span className="mini-pill">减少文字输入</span>
          </div>

          <div className="product-grid">
            {productLines.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`product-card ${formState.productLineId === item.id ? 'selected' : ''} ${item.accent}`}
                onClick={() => selectProductLine(item.id)}
              >
                <span className="product-icon">{item.icon}</span>
                <strong>{item.shortName}</strong>
                <p>{item.description}</p>
              </button>
            ))}
          </div>

          <div className="selector-block">
            <div className="block-title">
              <strong>对应设备</strong>
              <span>{selectedProductLine.name}</span>
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
                    {device.category} · SN {device.snPrefix}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="selector-block">
            <div className="block-title">
              <strong>手术类型</strong>
              <span>优先点选，少打字</span>
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
        </section>

        <section className="surface-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Hospital</p>
              <h3>医院与人员</h3>
            </div>
          </div>

          <label className="field">
            <span>医院搜索</span>
            <input
              value={hospitalKeyword}
              onChange={(event) => setHospitalKeyword(event.target.value)}
              placeholder="输入医院名称或区域"
            />
          </label>

          <div className="hospital-list">
            {filteredHospitals.map((hospital) => (
              <button
                key={hospital.id}
                type="button"
                className={`selector-card ${formState.hospitalId === hospital.id ? 'selected' : ''}`}
                onClick={() => selectHospital(hospital)}
              >
                <strong>{hospital.name}</strong>
                <span>
                  {hospital.region} · {hospital.level}
                </span>
              </button>
            ))}
          </div>

          <div className="field-row">
            <label className="field">
              <span>主刀医生</span>
              <input
                value={formState.doctorName}
                onChange={(event) => updateField('doctorName', event.target.value)}
                placeholder="输入或点选常用医生"
              />
            </label>
            <label className="field compact">
              <span>跟台日期</span>
              <input
                type="date"
                value={formState.caseDate}
                onChange={(event) => updateField('caseDate', event.target.value)}
              />
            </label>
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

          <div className="selector-block compact-block">
            <div className="block-title">
              <strong>临床工程师</strong>
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
          </div>
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
              <h3>{selectedDevice.modelName}</h3>
            </div>
            <span className="mini-pill">{selectedProductLine.shortName}</span>
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
                  value={formState.parameters[parameter.key]}
                  onChange={(event) => updateParameter(parameter.key, event.target.value)}
                  placeholder={parameter.placeholder}
                />
              </label>
            ))}
          </div>

          <div className="selector-block">
            <div className="block-title">
              <strong>病例状态</strong>
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

          <label className="switch-card">
            <div>
              <strong>是否出现异常</strong>
              <p>用于标记报警、阻抗波动、路径偏移或温控异常。</p>
            </div>
            <button
              type="button"
              className={`switch ${formState.abnormal ? 'on' : ''}`}
              onClick={() => updateField('abnormal', !formState.abnormal)}
            >
              <span />
            </button>
          </label>

          <label className="field">
            <span>术中备注</span>
            <textarea
              rows="4"
              value={formState.notes}
              onChange={(event) => updateField('notes', event.target.value)}
              placeholder="记录扫描复位、进针路径、医生反馈或设备表现"
            />
          </label>
        </section>

        <section className="surface-card side-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Quick View</p>
              <h3>本次跟台摘要</h3>
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
              <dt>产品线</dt>
              <dd>{selectedProductLine.name}</dd>
            </div>
            <div>
              <dt>设备</dt>
              <dd>{selectedDevice.modelName}</dd>
            </div>
            <div>
              <dt>状态</dt>
              <dd>{formState.status}</dd>
            </div>
          </dl>

          <div className="tip-card">
            <strong>数据库策略</strong>
            <p>提交后会写入本地病例库，方便后续接入 Supabase 或企业数据库。</p>
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
              <h3>耗材尽量点选录入</h3>
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
                      placeholder="如：射频针"
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
                    placeholder="支持后续接扫码"
                  />
                </label>
                <div className="inline-actions">
                  <span className="mini-pill">相机扫码入口预留</span>
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
              <h3>图片辅助留档</h3>
            </div>
          </div>

          <label className="upload-panel">
            <input type="file" accept="image/*" capture="environment" onChange={handleAttachmentChange} />
            <strong>拍摄耗材标签</strong>
            <p>当前先记录图片元数据，后续可扩展 OCR 和条码识别。</p>
          </label>

          <div className="tip-card strong">
            <strong>当前推荐模板</strong>
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
            <span className="mini-pill">提交后写入数据库</span>
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
            <p>建议保留摆位、耗材标签、术后设备状态等图像资料。</p>
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

  return (
    <div className="app-shell">
      <header className="hero-shell">
        <section className="brand-panel">
          <div className="brand-copy">
            <p className="eyebrow">Curaway Clinical Case Support</p>
            <h1>临床跟台工作台</h1>
            <p className="hero-text">
              面向 CT 引导导航机器人、IRE、射频消融、活检穿刺、静脉闭合、高频电刀和神经热凝等产品线，
              通过产品模板减少现场文字录入，并把病例写入数据库。
            </p>
          </div>
          <div className="brand-logo-card">
            <img src="/curaway-logo.jpg" alt="Curaway" className="brand-logo" />
            <div className="status-ribbon">
              <span className={`status-dot ${saveState}`} />
              {saveState === 'saving' ? '草稿保存中' : '数据库已接通'}
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
        </section>
      </header>

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
                  <p className="section-kicker">Database</p>
                  <h2>数据库表设计</h2>
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
              <p className="muted-text">尽量用卡片和点选完成录入，提交后写入病例数据库。</p>
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
                className={`step-item ${index === stepIndex ? 'active' : ''} ${index < stepIndex ? 'done' : ''}`}
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
