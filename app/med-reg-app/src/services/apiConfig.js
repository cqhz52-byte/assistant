const CONFIG_KEY = 'med_reg_api_config'

function safeParse(raw) {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function loadApiConfig() {
  const sessionConfig = safeParse(sessionStorage.getItem(CONFIG_KEY))
  if (sessionConfig) return sessionConfig
  return safeParse(localStorage.getItem(CONFIG_KEY))
}

export function saveApiConfig(config, remember = false) {
  const payload = JSON.stringify(config)
  if (remember) {
    localStorage.setItem(CONFIG_KEY, payload)
    sessionStorage.removeItem(CONFIG_KEY)
    return
  }
  sessionStorage.setItem(CONFIG_KEY, payload)
  localStorage.removeItem(CONFIG_KEY)
}

export function hasPersistentApiConfig() {
  return !!localStorage.getItem(CONFIG_KEY)
}

