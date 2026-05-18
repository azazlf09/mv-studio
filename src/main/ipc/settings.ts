import { app, ipcMain, safeStorage, dialog } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import { IPC } from '../../shared/ipcChannels'
import { AppSettings, DEFAULT_SETTINGS } from '../../shared/schema'
import { createProvider } from '../providers'

const settingsFile = () => path.join(app.getPath('userData'), 'settings.enc')

async function readSettings(): Promise<AppSettings> {
  try {
    const buf = await fs.readFile(settingsFile())
    let json: string
    if (safeStorage.isEncryptionAvailable()) {
      json = safeStorage.decryptString(buf)
    } else {
      json = buf.toString('utf-8')
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(json) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

async function writeSettings(s: AppSettings): Promise<void> {
  const json = JSON.stringify(s, null, 2)
  const data = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(json)
    : Buffer.from(json, 'utf-8')
  await fs.mkdir(path.dirname(settingsFile()), { recursive: true })
  await fs.writeFile(settingsFile(), data)
}

export function registerSettingsHandlers() {
  ipcMain.handle(IPC.SETTINGS_GET, async () => {
    const s = await readSettings()
    // 不再回填脱敏 apiKey 到输入框；改为只暴露"是否已设置 + 尾号"给 UI。
    // 保持 apiKey 字段为空字符串，UI 用 apiKeySet/apiKeyTail 判断状态。
    return {
      ...s,
      apiKey: '',
      apiKeySet: !!s.apiKey,
      apiKeyTail: s.apiKey ? s.apiKey.slice(-4) : ''
    } as any
  })

  ipcMain.handle(IPC.SETTINGS_SET, async (_e, patch: Partial<AppSettings> & { clearApiKey?: boolean }) => {
    const cur = await readSettings()
    const { clearApiKey, ...rest } = patch as any
    const next: AppSettings = { ...cur, ...rest }
    if (clearApiKey) {
      next.apiKey = ''
    } else if (!patch.apiKey) {
      // 空 → 保留原 key（不覆盖）
      next.apiKey = cur.apiKey
    }
    // 老的脱敏字符串兼容：以 *** 开头视作"不修改"
    if (typeof patch.apiKey === 'string' && patch.apiKey.startsWith('***')) {
      next.apiKey = cur.apiKey
    }
    await writeSettings(next)
    return { ok: true }
  })

  ipcMain.handle(IPC.SETTINGS_TEST, async () => {
    const s = await readSettings()
    if (s.provider !== 'claude-code-cli' && !s.apiKey) {
      return { ok: false, message: '尚未填写 API Key' }
    }
    if (!s.defaultModel) return { ok: false, message: '尚未选择模型' }
    try {
      const provider = createProvider(s)
      const txt = await provider.ping(s.defaultModel)
      return { ok: true, message: `连接成功，模型回复：${(txt || '').slice(0, 40) || '(空)'}` }
    } catch (e: any) {
      return { ok: false, message: `失败：${e?.message ?? String(e)}` }
    }
  })

  ipcMain.handle(IPC.SETTINGS_PICK_DIR, async () => {
    const r = await dialog.showOpenDialog({
      title: '选择项目存放目录',
      properties: ['openDirectory', 'createDirectory']
    })
    if (r.canceled || r.filePaths.length === 0) return null
    return r.filePaths[0]
  })
}

export async function getSettings(): Promise<AppSettings> {
  return readSettings()
}
