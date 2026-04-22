<template>
  <div class="app-container">
    <header class="top-nav">
      <div class="logo-area">
        <span class="icon">🧪</span>
        <h1>医疗器械法规 AI 分析系统 <span class="badge">本地优先版</span></h1>
      </div>
      <div class="actions">
        <div class="status-indicator">
          <span class="dot" :class="{ 'is-active': isApiConfigured }"></span>
          {{ isApiConfigured ? 'DeepSeek 已就绪' : '请配置 API' }}
        </div>
        <button class="settings-btn" @click="showSettings = true">⚙️ API 配置</button>
      </div>
    </header>

    <main class="main-content">
      <RegAnalyze />
    </main>

    <div v-if="showSettings" class="modal-mask" @click.self="showSettings = false">
      <div class="modal-container">
        <div class="modal-header">
          <h3>系统全局配置</h3>
          <button class="close-btn" @click="showSettings = false">×</button>
        </div>

        <div class="modal-body">
          <div class="form-item">
            <label>API Key (DeepSeek)</label>
            <input
              v-model="apiConfig.apiKey"
              type="password"
              placeholder="在此粘贴您的 DeepSeek API Key"
              class="modal-input"
              autocomplete="off"
            />
          </div>

          <div class="form-item">
            <label>Base URL</label>
            <input
              v-model="apiConfig.baseUrl"
              type="text"
              placeholder="https://api.deepseek.com"
              class="modal-input"
            />
          </div>

          <div class="form-item">
            <label>选择云端推理模型</label>
            <select v-model="apiConfig.model" class="modal-input">
              <option value="deepseek-chat">deepseek-chat (常规对话)</option>
              <option value="deepseek-reasoner">deepseek-reasoner (深度思考/推理)</option>
            </select>
          </div>

          <div class="form-item">
            <label class="remember-row">
              <input v-model="rememberApiKey" type="checkbox" />
              在此设备长期保存 API Key（不勾选则仅当前会话有效）
            </label>
          </div>

          <div class="form-item model-box">
            <label>🧠 本地向量模型（外部挂载，可选）</label>
            <p class="privacy-note">
              系统默认读取项目 public 目录模型。你也可以手动指定外部模型目录（包含
              <code>config.json</code> 和 <code>.onnx</code> 文件）。
            </p>
            <div style="display:flex; gap:10px;">
              <input
                type="file"
                ref="modelDirInput"
                webkitdirectory
                directory
                @change="handleModelSelect"
                style="display:none;"
              />
              <button
                class="settings-btn"
                style="flex:1; text-align:center; padding: 10px;"
                @click="$refs.modelDirInput.click()"
              >
                {{ appStore.customModelFiles?.length > 0
                  ? `✅ 已挂载外部模型 (${appStore.customModelFiles.length} 个文件)`
                  : '📂 指定外部模型文件夹' }}
              </button>
            </div>
          </div>

          <p class="privacy-note" style="margin-top: 20px;">
            🔐 安全提示：API Key 不会写死在代码中。默认仅保存在会话存储（关闭浏览器即失效）。
          </p>
        </div>

        <div class="modal-footer">
          <button class="save-btn" @click="saveSettings">保存配置</button>
          <button class="cancel-btn" @click="showSettings = false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import RegAnalyze from './views/RegAnalyze.vue'
import { appStore } from './store.js'
import { hasPersistentApiConfig, loadApiConfig, saveApiConfig } from './services/apiConfig.js'

const showSettings = ref(false)
const rememberApiKey = ref(false)

const apiConfig = reactive({
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-chat',
})

const isApiConfigured = computed(() => {
  return apiConfig.apiKey && apiConfig.apiKey.length > 10
})

onMounted(() => {
  const savedConfig = loadApiConfig()
  if (savedConfig) {
    Object.assign(apiConfig, savedConfig)
    rememberApiKey.value = hasPersistentApiConfig()
  }
})

const handleModelSelect = (e) => {
  const files = Array.from(e.target.files || [])
  if (files.length === 0) return

  const isValidModel = files.some((f) => f.name === 'config.json' || f.name.endsWith('.onnx'))
  if (!isValidModel) {
    alert('未检测到有效模型文件，请确认你选择的是正确的模型目录。')
    return
  }

  appStore.customModelFiles = files
  alert(`已挂载 ${files.length} 个模型文件。`)
}

const saveSettings = () => {
  saveApiConfig(apiConfig, rememberApiKey.value)
  showSettings.value = false
}
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f4f7f9;
}

.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 64px;
  background-color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

h1 {
  font-size: 18px;
  color: #1e293b;
  margin: 0;
  font-weight: 600;
}

.badge {
  font-size: 11px;
  background-color: #e0f2fe;
  color: #0369a1;
  padding: 2px 8px;
  border-radius: 12px;
  margin-left: 8px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.status-indicator {
  font-size: 13px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  background-color: #cbd5e1;
  border-radius: 50%;
}

.dot.is-active {
  background-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.settings-btn {
  background: white;
  border: 1px solid #cbd5e1;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  color: #475569;
  font-weight: 500;
  transition: all 0.2s;
}

.settings-btn:hover {
  background-color: #f1f5f9;
  color: #0f172a;
  border-color: #94a3b8;
}

.main-content {
  flex: 1;
  padding: 20px;
  display: flex;
  overflow: hidden;
}

.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-container {
  background: white;
  width: 460px;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.modal-header {
  padding: 16px 24px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  font-size: 16px;
  margin: 0;
  color: #0f172a;
  font-weight: bold;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #94a3b8;
  cursor: pointer;
}

.modal-body {
  padding: 20px 24px;
}

.form-item {
  margin-bottom: 16px;
}

.form-item label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
}

.modal-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
  color: #1e293b;
  background: #f8fafc;
}

.remember-row {
  display: flex !important;
  align-items: center;
  gap: 8px;
}

.model-box {
  margin-top: 24px;
  border-top: 1px dashed #cbd5e1;
  padding-top: 16px;
}

.privacy-note {
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}

.modal-footer {
  padding: 16px 24px;
  background-color: #f8fafc;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.save-btn {
  background-color: #2563eb;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn {
  background: white;
  border: 1px solid #cbd5e1;
  padding: 10px 20px;
  border-radius: 6px;
  color: #475569;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}
</style>
