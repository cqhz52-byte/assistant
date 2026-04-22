import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  createDefaultCaseDraft,
  createEmptyConsumable,
  dashboardMetrics,
  devices,
  hospitals,
  moduleRoadmap,
  recentCases,
  schemaHighlights,
  surgeries,
  todayTasks,
} from './lib/clinicalData'
import { loadDraft, removeDraft, saveDraft } from './lib/offlineStore'

const DRAFT_KEY = 'active-clinical-case'

const steps = [
  { id: 'base', label: '基础信息', hint: '医院、医生、术式、型号' },
  { id: 'params', label: '术中参数', hint: '动态参数与异常标记' },
  { id: 'consumables', label: '耗材使用', hint: '批号、数量、拍照辅助' },
  { id: 'summary', label: '总结归档', hint: '结果、图片、离线草稿' },
]

function formatDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '刚刚'

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getHospitalById(id) {
  return hospitals.find((item) => item.id === id) ?? null
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

  const selectedDevice = getDeviceById(merged.deviceId)
  merged.parameters = buildParameterState(selectedDevice, draft?.parameters)
  return merged
}

function App() {
  const [view, setView] = useState('dashboard')
  const [stepIndex, setStepIndex] = useState(0)
  const [formState, setFormState] = useState(() => normalizeDraft(null))
  const [hospitalKeyword, setHospitalKeyword] = useState('')
  const [saveState, setSaveState] = useState('loading')
  const [lastSavedAt, setLastSavedAt] = useState('')
  const [notice, setNotice] = useState('')
  const [isHydrated, setIsHydrated] = useState(false)
  const [recentCaseList, setRecentCaseList] = useState(recentCases)

  const selectedHospital = useMemo(
    () => getHospitalById(formState.hospitalId),
    [formState.hospitalId],
  )
  const selectedDevice = useMemo(() => getDeviceById(formState.deviceId), [formState.deviceId])

  const filteredHospitals = useMemo(() => {
    const keyword = hospitalKeyword.trim().toLowerCase()
    if (!keyword) return hospitals

    return hospitals.filter((hospital) => {
      const text = `${hospital.name} ${hospital.region} ${hospital.level}`.toLowerCase()
      return text.includes(keyword)
    })
  }, [hospitalKeyword])

  useEffect(() => {
    let active = true

    async function hydrateDraft() {
      const draft = await loadDraft(DRAFT_KEY)
      if (!active) return

      if (draft) {
        const nextDraft = normalizeDraft(draft)
        setFormState(nextDraft)
        const hospital = getHospitalById(nextDraft.hospitalId)
        setHospitalKeyword(hospital?.name ?? '')
        setLastSavedAt(draft.savedAt ?? '')
        setNotice('已恢复上次未完成的离线草稿。')
        setView('form')
      }

      setSaveState('idle')
      setIsHydrated(true)
    }

    hydrateDraft()

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
        setLastSavedAt(new Date().toISOString())
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    }, 320)

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

  function selectHospital(hospital) {
    setHospitalKeyword(hospital.name)
    updateField('hospitalId', hospital.id)
  }

  function selectDevice(deviceId) {
    setFormState((current) => {
      const nextDevice = getDeviceById(deviceId)
      return {
        ...current,
        deviceId,
        parameters: buildParameterState(nextDevice, current.parameters),
      }
    })
  }

  function updateConsumable(index, field, value) {
    setFormState((current) => ({
      ...current,
      consumables: current.consumables.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }))
  }

  function addConsumable() {
    setFormState((current) => ({
      ...current,
      consumables: [...current.consumables, createEmptyConsumable()],
    }))
  }

  function removeConsumableItem(index) {
    setFormState((current) => ({
      ...current,
      consumables:
        current.consumables.length === 1
          ? current.consumables
          : current.consumables.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  function handleAttachmentChange(event) {
    const files = Array.from(event.target.files ?? [])
    const nextAttachments = files.map((file) => ({
      name: file.name,
      size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      type: file.type || 'image/*',
    }))

    setFormState((current) => ({
      ...current,
      attachments: nextAttachments,
    }))
  }

  async function clearDraftState() {
    const nextDraft = normalizeDraft(null)
    setFormState(nextDraft)
    setHospitalKeyword('')
    setStepIndex(0)
    setNotice('已清空本地草稿，当前表单已重置。')
    setSaveState('idle')
    setLastSavedAt('')
    await removeDraft(DRAFT_KEY)
  }

  function validateCurrentStep() {
    if (stepIndex !== 0) return true

    if (!formState.hospitalId || !formState.doctorName.trim() || !formState.deviceId) {
      setNotice('请先完整填写医院、医生和器械型号，再进入下一步。')
      return false
    }

    return true
  }

  function goNextStep() {
    if (!validateCurrentStep()) return
    setStepIndex((current) => Math.min(current + 1, steps.length - 1))
    setNotice('')
  }

  function goPreviousStep() {
    setStepIndex((current) => Math.max(current - 1, 0))
    setNotice('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!formState.hospitalId || !formState.doctorName.trim()) {
      setNotice('提交前请确认基础信息已填写完整。')
      setStepIndex(0)
      return
    }

    const hospital = getHospitalById(formState.hospitalId)
    const device = getDeviceById(formState.deviceId)
    const newCase = {
      id: `case-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${recentCaseList.length + 1}`,
      hospital: hospital?.name ?? '未选择医院',
      doctor: formState.doctorName,
      device: device.modelName,
      status: '待同步',
      summary: formState.outcome || '已完成现场记录，待同步到云端。',
      updatedAt: new Date().toISOString(),
    }

    setRecentCaseList((current) => [newCase, ...current].slice(0, 4))
    await removeDraft(DRAFT_KEY)
    setFormState(normalizeDraft(null))
    setHospitalKeyword('')
    setStepIndex(0)
    setView('dashboard')
    setLastSavedAt('')
    setSaveState('idle')
    setNotice('跟台记录已生成本地提交单，当前版本等待后端同步接口接入。')
  }

  function renderStepContent() {
    if (stepIndex === 0) {
      return (
        <div className="step-grid">
          <div className="panel-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Step 1</p>
                <h3>选择医院与手术信息</h3>
              </div>
              <span className="mini-tag">支持模糊搜索</span>
            </div>

            <label className="field">
              <span>医院搜索</span>
              <input
                value={hospitalKeyword}
                onChange={(event) => setHospitalKeyword(event.target.value)}
                placeholder="输入医院名称、区域或等级"
              />
            </label>

            <div className="selector-list hospital-list">
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
                <span>手术医生</span>
                <input
                  value={formState.doctorName}
                  onChange={(event) => updateField('doctorName', event.target.value)}
                  placeholder="输入主刀医生姓名"
                />
              </label>
              <label className="field">
                <span>跟台日期</span>
                <input
                  type="date"
                  value={formState.caseDate}
                  onChange={(event) => updateField('caseDate', event.target.value)}
                />
              </label>
            </div>

            <label className="field">
              <span>手术类型</span>
              <div className="chip-row">
                {surgeries.map((item) => (
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
            </label>
          </div>

          <div className="panel-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Device</p>
                <h3>器械型号</h3>
              </div>
              <span className="mini-tag">动态参数</span>
            </div>

            <div className="selector-list">
              {devices.map((device) => (
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

            <div className="detail-card accent">
              <p className="section-kicker">当前型号参数模板</p>
              <ul className="plain-list">
                {selectedDevice.parameterSchema.map((parameter) => (
                  <li key={parameter.key}>
                    {parameter.label} ({parameter.unit})
                  </li>
                ))}
              </ul>
            </div>

            {selectedHospital ? (
              <div className="detail-card">
                <p className="section-kicker">已选医院</p>
                <strong>{selectedHospital.name}</strong>
                <p>
                  {selectedHospital.region} 区域 · {selectedHospital.level}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )
    }

    if (stepIndex === 1) {
      return (
        <div className="step-grid">
          <div className="panel-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Step 2</p>
                <h3>术中参数录入</h3>
              </div>
              <span className="mini-tag">{selectedDevice.category}</span>
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

            <label className="switch-row">
              <div>
                <strong>是否异常</strong>
                <p>用于标记术中设备异常、阻抗异常或参数波动。</p>
              </div>
              <button
                type="button"
                className={`switch ${formState.abnormal ? 'on' : ''}`}
                onClick={() => updateField('abnormal', !formState.abnormal)}
                aria-pressed={formState.abnormal}
              >
                <span />
              </button>
            </label>

            <label className="field">
              <span>术中备注</span>
              <textarea
                rows="5"
                value={formState.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                placeholder="记录针路、能量释放、组织反应或医生反馈"
              />
            </label>
          </div>

          <div className="panel-card side-panel-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Quick View</p>
                <h3>本次跟台概览</h3>
              </div>
            </div>

            <dl className="summary-list">
              <div>
                <dt>医院</dt>
                <dd>{selectedHospital?.name ?? '未选择'}</dd>
              </div>
              <div>
                <dt>医生</dt>
                <dd>{formState.doctorName || '未填写'}</dd>
              </div>
              <div>
                <dt>术式</dt>
                <dd>{formState.surgeryType}</dd>
              </div>
              <div>
                <dt>设备</dt>
                <dd>{selectedDevice.modelName}</dd>
              </div>
            </dl>

            <div className="detail-card">
              <p className="section-kicker">离线模式</p>
              <p>当前输入会自动保存到本地 IndexedDB，手术室断网时也不会丢失。</p>
            </div>
          </div>
        </div>
      )
    }

    if (stepIndex === 2) {
      return (
        <div className="step-grid">
          <div className="panel-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Step 3</p>
                <h3>耗材与批号追踪</h3>
              </div>
              <button type="button" className="ghost-button" onClick={addConsumable}>
                新增耗材
              </button>
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
                        placeholder="如：一次性电极针"
                      />
                    </label>
                    <label className="field compact-field">
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
                      placeholder="支持后续接入扫码识别"
                    />
                  </label>

                  <div className="consumable-actions">
                    <span className="mini-tag">摄像头扫码预留位</span>
                    <button type="button" className="text-button" onClick={() => removeConsumableItem(index)}>
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-card side-panel-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Capture</p>
                <h3>扫码辅助</h3>
              </div>
            </div>

            <label className="upload-tile">
              <input type="file" accept="image/*" capture="environment" onChange={handleAttachmentChange} />
              <strong>拍摄耗材标签</strong>
              <p>当前版本先保存图片清单，后续可接 OCR / 条码识别。</p>
            </label>

            <div className="detail-card accent">
              <p className="section-kicker">已记录耗材</p>
              <strong>{formState.consumables.length} 项</strong>
              <p>建议现场拍摄批号标签，方便术后复核与追溯。</p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="step-grid">
        <div className="panel-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Step 4</p>
              <h3>总结与图片归档</h3>
            </div>
            <span className="mini-tag">提交前复核</span>
          </div>

          <label className="field">
            <span>术后结果 / Outcome</span>
            <textarea
              rows="4"
              value={formState.outcome}
              onChange={(event) => updateField('outcome', event.target.value)}
              placeholder="记录术中结果、医生结论或设备表现"
            />
          </label>

          <label className="field">
            <span>并发症 / 特殊情况</span>
            <textarea
              rows="3"
              value={formState.complications}
              onChange={(event) => updateField('complications', event.target.value)}
              placeholder="如无，可填写“未见异常”"
            />
          </label>

          <label className="upload-tile large">
            <input type="file" accept="image/*,video/*" multiple onChange={handleAttachmentChange} />
            <strong>上传现场图片 / 视频</strong>
            <p>适合记录摆位、耗材标签、术后设备状态等资料。</p>
          </label>

          <div className="attachment-list">
            {formState.attachments.length === 0 ? (
              <p className="muted-text">尚未选择附件，当前区域为上传占位与元数据预览。</p>
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
        </div>

        <div className="panel-card side-panel-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Review</p>
              <h3>提交摘要</h3>
            </div>
          </div>

          <dl className="summary-list">
            <div>
              <dt>医院</dt>
              <dd>{selectedHospital?.name ?? '未选择'}</dd>
            </div>
            <div>
              <dt>医生</dt>
              <dd>{formState.doctorName || '未填写'}</dd>
            </div>
            <div>
              <dt>设备</dt>
              <dd>{selectedDevice.modelName}</dd>
            </div>
            <div>
              <dt>耗材数</dt>
              <dd>{formState.consumables.length} 项</dd>
            </div>
            <div>
              <dt>附件</dt>
              <dd>{formState.attachments.length} 个</dd>
            </div>
          </dl>

          <div className="detail-card">
            <p className="section-kicker">保存状态</p>
            <strong>{saveState === 'saving' ? '正在保存草稿' : '草稿已更新'}</strong>
            <p>{lastSavedAt ? `最近保存：${formatDateTime(lastSavedAt)}` : '尚未生成本地时间戳'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Clinical Case Support</p>
          <h1>医疗器械临床跟台响应式工作台</h1>
          <p className="hero-text">
            面向工程师的手机优先 Web App 原型，覆盖工作台、分步录入、离线缓存与 Supabase
            数据模型落点。
          </p>
        </div>

        <div className="hero-status">
          <div className="status-pill">
            <span className={`status-dot ${saveState}`} />
            {saveState === 'saving' ? '离线草稿保存中' : '支持 PWA 与本地缓存'}
          </div>
          <div className="hero-actions">
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
        </div>
      </section>

      {notice ? <div className="notice-banner">{notice}</div> : null}

      {view === 'dashboard' ? (
        <main className="dashboard-layout">
          <section className="metrics-grid">
            {dashboardMetrics.map((metric) => (
              <article key={metric.id} className="metric-card">
                <p>{metric.label}</p>
                <strong>{metric.value}</strong>
                <span>{metric.helper}</span>
              </article>
            ))}
          </section>

          <section className="content-grid">
            <article className="board-card">
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
                    <div className="task-meta">
                      <span>{task.time}</span>
                      <span className={`mini-tag ${task.status === '进行中' ? 'accent-tag' : ''}`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="board-card">
              <div className="section-head">
                <div>
                  <p className="section-kicker">Recent Cases</p>
                  <h2>最近 3 场手术</h2>
                </div>
              </div>

              <div className="case-list">
                {recentCaseList.slice(0, 3).map((item) => (
                  <div key={item.id} className="case-item">
                    <div>
                      <strong>{item.hospital}</strong>
                      <p>
                        {item.doctor} · {item.device}
                      </p>
                      <span>{item.summary}</span>
                    </div>
                    <div className="task-meta">
                      <span className={`mini-tag ${item.status === '进行中' ? 'accent-tag' : ''}`}>
                        {item.status}
                      </span>
                      <span>{formatDateTime(item.updatedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="board-card">
              <div className="section-head">
                <div>
                  <p className="section-kicker">Modules</p>
                  <h2>核心模块</h2>
                </div>
              </div>

              <div className="roadmap-grid">
                {moduleRoadmap.map((item) => (
                  <div key={item.id} className="roadmap-card">
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="board-card">
              <div className="section-head">
                <div>
                  <p className="section-kicker">Schema</p>
                  <h2>Supabase 数据模型映射</h2>
                </div>
              </div>

              <div className="schema-table">
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
            + 新建跟台记录
          </button>
        </main>
      ) : (
        <main className="form-layout">
          <section className="form-header-card">
            <div>
              <p className="section-kicker">Case Form</p>
              <h2>新建跟台记录</h2>
              <p className="muted-text">采用手机优先的 Stepper 表单，术中减少自由输入，保留离线草稿。</p>
            </div>
            <div className="header-actions">
              <button type="button" className="ghost-button" onClick={clearDraftState}>
                清空草稿
              </button>
              <span className="mini-tag">
                {lastSavedAt ? `最近保存 ${formatDateTime(lastSavedAt)}` : '自动保存待激活'}
              </span>
            </div>
          </section>

          <section className="stepper-card">
            {steps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                className={`stepper-item ${index === stepIndex ? 'active' : ''} ${index < stepIndex ? 'done' : ''}`}
                onClick={() => setStepIndex(index)}
              >
                <span>{index + 1}</span>
                <div>
                  <strong>{step.label}</strong>
                  <p>{step.hint}</p>
                </div>
              </button>
            ))}
          </section>

          <form className="case-form-card" onSubmit={handleSubmit}>
            {renderStepContent()}

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
                  <button type="submit" className="primary-button">
                    生成跟台记录
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
