const DB_NAME = 'clinical-case-support'
const STORE_NAME = 'drafts'
const FALLBACK_PREFIX = 'case-support-draft:'

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      resolve(null)
      return
    }

    const request = window.indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB 打开失败'))
  })
}

function readFallback(key) {
  const raw = window.localStorage.getItem(`${FALLBACK_PREFIX}${key}`)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeFallback(key, value) {
  window.localStorage.setItem(`${FALLBACK_PREFIX}${key}`, JSON.stringify(value))
}

function removeFallback(key) {
  window.localStorage.removeItem(`${FALLBACK_PREFIX}${key}`)
}

async function saveDraft(key, value) {
  const payload = { ...value, savedAt: new Date().toISOString() }

  try {
    const database = await openDatabase()
    if (!database) {
      writeFallback(key, payload)
      return
    }

    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(payload, key)
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error ?? new Error('草稿保存失败'))
    })
  } catch {
    writeFallback(key, payload)
  }
}

async function loadDraft(key) {
  try {
    const database = await openDatabase()
    if (!database) return readFallback(key)

    const result = await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly')
      const request = transaction.objectStore(STORE_NAME).get(key)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error ?? new Error('草稿读取失败'))
    })

    return result ?? readFallback(key)
  } catch {
    return readFallback(key)
  }
}

async function removeDraft(key) {
  try {
    const database = await openDatabase()
    if (!database) {
      removeFallback(key)
      return
    }

    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).delete(key)
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error ?? new Error('草稿清除失败'))
    })
  } finally {
    removeFallback(key)
  }
}

export { loadDraft, removeDraft, saveDraft }
