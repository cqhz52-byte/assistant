import { cp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const sourceDir = path.join(rootDir, 'app')
const outputDir = path.join(rootDir, 'public', 'app')
const manifestPath = path.join(rootDir, 'public', 'tool-manifest.json')

const DISPLAY_NAME_MAP = {
  guide: '注册助手',
  'ZY面试官': '面试助手',
  命: '五行八卦',
  样本量计算器: '样本计算',
  'med-reg-app': '医疗法规助手',
  demonstration: '产品交互演示',
}

const ICON_MAP = {
  regulatory: '📜',
  guidance: '🧭',
  interview: '🎯',
  calculation: '🧮',
  simulation: '🧪',
  assessment: '🧠',
  general: '🧰',
}

function normalizeName(name) {
  return name.replace(/\.html$/i, '')
}

function detectCategory(name) {
  const lower = name.toLowerCase()
  if (lower.includes('demonstration') || name.includes('演示')) return 'simulation'
  if (lower.includes('med-reg') || name.includes('法规') || lower.includes('reg')) return 'regulatory'
  if (lower.includes('guide') || name.includes('注册')) return 'guidance'
  if (name.includes('样本') || name.includes('计算')) return 'calculation'
  if (name.includes('仿真')) return 'simulation'
  if (name.includes('面试')) return 'interview'
  if (name.includes('测评')) return 'assessment'
  return 'general'
}

function getDisplayName(name) {
  return DISPLAY_NAME_MAP[name] || name
}

function buildTool({ id, name, fileName, category, size, updatedAt, url }) {
  return {
    id,
    name,
    displayName: getDisplayName(name),
    fileName,
    category,
    icon: ICON_MAP[category] || ICON_MAP.general,
    size,
    updatedAt,
    url,
  }
}

async function exists(filePath) {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

async function main() {
  await rm(outputDir, { recursive: true, force: true })
  await mkdir(outputDir, { recursive: true })

  const entries = await readdir(sourceDir, { withFileTypes: true })
  const tools = []

  for (const entry of entries) {
    const entryName = entry.name
    const srcPath = path.join(sourceDir, entryName)
    const destPath = path.join(outputDir, entryName)

    if (entry.isFile() && entryName.toLowerCase().endsWith('.html')) {
      await cp(srcPath, destPath, { force: true })
      const fileStat = await stat(srcPath)
      const normalized = normalizeName(entryName)
      const category = detectCategory(normalized)
      tools.push(
        buildTool({
          id: normalized,
          name: normalized,
          fileName: entryName,
          category,
          size: fileStat.size,
          updatedAt: new Date(fileStat.mtimeMs).toISOString(),
          url: `app/${encodeURIComponent(entryName)}`,
        }),
      )
      continue
    }

    if (entry.isDirectory()) {
      await cp(srcPath, destPath, { recursive: true, force: true })
      const launchCandidates = ['dist/index.html', 'index.html']
      let launchPath = null
      let launchRelativePath = null

      for (const candidate of launchCandidates) {
        const candidatePath = path.join(srcPath, candidate)
        if (await exists(candidatePath)) {
          launchPath = candidatePath
          launchRelativePath = candidate
          break
        }
      }

      if (!launchPath || !launchRelativePath) continue

      const launchStat = await stat(launchPath)
      const category = detectCategory(entryName)
      tools.push(
        buildTool({
          id: entryName,
          name: entryName,
          fileName: `${entryName}/${launchRelativePath}`,
          category,
          size: launchStat.size,
          updatedAt: new Date(launchStat.mtimeMs).toISOString(),
          url: `app/${encodeURIComponent(entryName)}/${launchRelativePath}`,
        }),
      )
    }
  }

  tools.sort((a, b) => a.displayName.localeCompare(b.displayName, 'zh-Hans-CN'))
  await writeFile(manifestPath, JSON.stringify({ tools }, null, 2), 'utf8')
  console.log(`[sync:tools] synced ${tools.length} tools`)
}

main().catch((error) => {
  console.error('[sync:tools] failed:', error)
  process.exit(1)
})
