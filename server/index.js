import { createServer } from 'node:http'
import { Buffer } from 'node:buffer'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, 'db.json')
const port = 8787

async function readDb() {
  const raw = await readFile(dbPath, 'utf8')
  return JSON.parse(raw)
}

async function writeDb(data) {
  await writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8')
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  })
  response.end(JSON.stringify(payload))
}

async function readBody(request) {
  const chunks = []
  for await (const chunk of request) {
    chunks.push(chunk)
  }
  if (chunks.length === 0) {
    return {}
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function createCopilotOutput(prompt, section, tool) {
  return {
    title: `${tool} 已生成建议`,
    summary: `围绕“${section}”已生成结构化建议，可直接转入人工审核。`,
    bullets: [
      `根据任务“${prompt}”补充法规引用与术语一致性检查。`,
      '建议把关键变更同步到 CER、IFU 和风险管理文件。',
      '保留审阅节点，由注册、临床和 QA 分别确认高风险章节。',
    ],
  }
}

const server = createServer(async (request, response) => {
  const { method = 'GET', url = '/' } = request

  if (method === 'OPTIONS') {
    sendJson(response, 204, {})
    return
  }

  try {
    if (method === 'GET' && url === '/api/health') {
      sendJson(response, 200, { ok: true, date: new Date().toISOString() })
      return
    }

    if (method === 'POST' && url === '/api/auth/login') {
      const body = await readBody(request)
      if (!body.email || !body.password) {
        sendJson(response, 400, { message: '请输入邮箱和密码。' })
        return
      }

      const db = await readDb()
      sendJson(response, 200, {
        token: 'demo-token',
        user: db.user,
      })
      return
    }

    if (method === 'GET' && url === '/api/bootstrap') {
      const db = await readDb()
      sendJson(response, 200, db)
      return
    }

    if (method === 'POST' && url === '/api/projects') {
      const body = await readBody(request)
      const db = await readDb()
      const project = {
        id: `p-${Date.now()}`,
        name: body.name || '未命名项目',
        market: body.market || '待配置',
        stage: body.stage || '新建项目',
        updatedAt: new Date().toISOString().slice(0, 10),
        riskLevel: body.riskLevel || '中',
      }
      db.projects.unshift(project)
      db.activities.unshift({
        id: `a-${Date.now()}`,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        title: '新项目已创建',
        detail: `${project.name} 已加入项目列表。`,
      })
      await writeDb(db)
      sendJson(response, 201, project)
      return
    }

    if (method === 'POST' && url === '/api/copilot/generate') {
      const body = await readBody(request)
      const db = await readDb()
      const output = createCopilotOutput(
        body.prompt || '未命名任务',
        body.section || '通用章节',
        body.tool || 'AI Copilot',
      )
      db.activities.unshift({
        id: `a-${Date.now()}`,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        title: output.title,
        detail: output.summary,
      })
      await writeDb(db)
      sendJson(response, 200, output)
      return
    }

    if (method === 'POST' && url === '/api/uploads') {
      const body = await readBody(request)
      const db = await readDb()
      const document = {
        id: `d-${Date.now()}`,
        projectId: body.projectId || db.projects[0]?.id || 'p-unknown',
        name: body.name || '未命名文件',
        type: body.type || '未分类',
        size: body.size || '未知大小',
        updatedAt: new Date().toISOString().slice(0, 10),
        status: '已导入待处理',
      }
      db.documents.unshift(document)
      db.activities.unshift({
        id: `a-${Date.now() + 1}`,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        title: '新文件已导入',
        detail: `${document.name} 已进入知识库处理队列。`,
      })
      await writeDb(db)
      sendJson(response, 201, document)
      return
    }

    sendJson(response, 404, { message: '未找到接口。' })
  } catch (error) {
    sendJson(response, 500, {
      message: '服务器内部错误。',
      detail: error instanceof Error ? error.message : String(error),
    })
  }
})

server.listen(port, () => {
  console.log(`MedDevice AI server running at http://localhost:${port}`)
})
