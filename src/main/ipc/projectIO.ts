import { app, ipcMain, dialog } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import { randomBytes, randomUUID } from 'crypto'

let sharp: any = null
try {
  sharp = require('sharp')
} catch (e) {
  console.warn('[sharp] not available, images will be saved without compression:', (e as Error).message)
}

const shortId = (len = 8): string =>
  randomBytes(Math.ceil((len * 3) / 4))
    .toString('base64url')
    .slice(0, len)
import { IPC, ImportImageArgs } from '../../shared/ipcChannels'
import { ProjectData, createEmptyProject, ImageRef } from '../../shared/schema'

const recentsFile = () => path.join(app.getPath('userData'), 'recentProjects.json')

type Recent = { id: string; name: string; path: string; lastOpened: string }

async function readRecents(): Promise<Recent[]> {
  try {
    const buf = await fs.readFile(recentsFile(), 'utf-8')
    return JSON.parse(buf)
  } catch { return [] }
}

async function writeRecents(r: Recent[]): Promise<void> {
  await fs.mkdir(path.dirname(recentsFile()), { recursive: true })
  await fs.writeFile(recentsFile(), JSON.stringify(r, null, 2), 'utf-8')
}

async function upsertRecent(p: ProjectData, projectPath: string) {
  const r = await readRecents()
  const filtered = r.filter(x => x.path !== projectPath)
  filtered.unshift({
    id: p.meta.id,
    name: p.meta.name,
    path: projectPath,
    lastOpened: new Date().toISOString()
  })
  await writeRecents(filtered.slice(0, 50))
}

function projectJsonPath(projectPath: string) {
  return path.join(projectPath, 'project.json')
}

async function readProject(projectPath: string): Promise<ProjectData> {
  const raw = await fs.readFile(projectJsonPath(projectPath), 'utf-8')
  return JSON.parse(raw)
}

async function writeProject(projectPath: string, data: ProjectData): Promise<void> {
  data.meta.updatedAt = new Date().toISOString()
  await fs.mkdir(projectPath, { recursive: true })
  await fs.writeFile(projectJsonPath(projectPath), JSON.stringify(data, null, 2), 'utf-8')
}

export function registerProjectHandlers() {
  ipcMain.handle(IPC.PROJECT_LIST, async () => {
    const recents = await readRecents()
    // Filter to existing
    const out: Recent[] = []
    for (const r of recents) {
      try {
        await fs.access(projectJsonPath(r.path))
        out.push(r)
      } catch {}
    }
    if (out.length !== recents.length) await writeRecents(out)
    return out
  })

  ipcMain.handle(IPC.PROJECT_CREATE, async (_e, args: { name: string; parentDir: string }) => {
    const safeName = args.name.replace(/[<>:"/\\|?*]/g, '_').trim() || '未命名MV项目'
    const projectPath = path.join(args.parentDir, safeName)
    try {
      await fs.access(projectPath)
      return { ok: false, message: '同名项目已存在' }
    } catch {}
    const data = createEmptyProject(safeName, randomUUID())
    await writeProject(projectPath, data)
    await fs.mkdir(path.join(projectPath, 'refs', 'character'), { recursive: true })
    await fs.mkdir(path.join(projectPath, 'refs', 'costume'), { recursive: true })
    await upsertRecent(data, projectPath)
    return { ok: true, projectPath, data }
  })

  ipcMain.handle(IPC.PROJECT_OPEN, async (_e, projectPath: string) => {
    const data = await readProject(projectPath)
    await upsertRecent(data, projectPath)
    return { projectPath, data }
  })

  ipcMain.handle(IPC.PROJECT_SAVE, async (_e, args: { projectPath: string; data: ProjectData }) => {
    await writeProject(args.projectPath, args.data)
    return { ok: true }
  })

  ipcMain.handle(IPC.PROJECT_PICK_FILE, async () => {
    const r = await dialog.showOpenDialog({
      title: '选择 project.json',
      filters: [{ name: 'MV 项目', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (r.canceled || r.filePaths.length === 0) return null
    return path.dirname(r.filePaths[0])
  })

  ipcMain.handle(IPC.PROJECT_DELETE, async (_e, projectPath: string) => {
    const recents = await readRecents()
    await writeRecents(recents.filter(r => r.path !== projectPath))
    return { ok: true }
  })

  ipcMain.handle(IPC.IMAGE_IMPORT, async (_e, args: ImportImageArgs): Promise<ImageRef> => {
    const id = shortId(8)
    const ext = args.filenameHint?.match(/\.(png|jpe?g|webp)$/i)?.[1]?.toLowerCase() ?? 'png'
    const filename = `${args.kind}-${id}.${ext === 'jpeg' ? 'jpg' : ext}`
    const dir = path.join(args.projectPath, 'refs', args.kind)
    await fs.mkdir(dir, { recursive: true })
    const b64 = args.fileBase64.includes(',') ? args.fileBase64.split(',')[1] : args.fileBase64
    const rawBuf = Buffer.from(b64, 'base64')

    let finalBuf: Buffer = rawBuf
    if (sharp) {
      try {
        const img = sharp(rawBuf).rotate()
        const meta = await img.metadata()
        const max = Math.max(meta.width ?? 0, meta.height ?? 0)
        const resized = max > 1568 ? img.resize({ width: 1568, height: 1568, fit: 'inside' }) : img
        finalBuf = ext === 'png'
          ? await resized.png({ compressionLevel: 8 }).toBuffer()
          : await resized.jpeg({ quality: 88 }).toBuffer()
      } catch (e) {
        console.warn('[sharp] resize failed, falling back to raw bytes:', (e as Error).message)
        finalBuf = rawBuf
      }
    }
    await fs.writeFile(path.join(dir, filename), finalBuf)
    return { id, filename, label: args.label }
  })

  ipcMain.handle(IPC.IMAGE_LOAD, async (_e, args: { projectPath: string; kind: 'character' | 'costume'; filename: string }) => {
    const p = path.join(args.projectPath, 'refs', args.kind, args.filename)
    const buf = await fs.readFile(p)
    const ext = path.extname(args.filename).slice(1).toLowerCase()
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    return `data:${mime};base64,${buf.toString('base64')}`
  })

  ipcMain.handle(IPC.EXPORT_TEXT, async (_e, args: { defaultName: string; content: string; ext: string }) => {
    const r = await dialog.showSaveDialog({
      title: '导出',
      defaultPath: args.defaultName,
      filters: [{ name: args.ext.toUpperCase(), extensions: [args.ext] }]
    })
    if (r.canceled || !r.filePath) return { ok: false }
    await fs.writeFile(r.filePath, args.content, 'utf-8')
    return { ok: true, path: r.filePath }
  })
}

export async function loadImageAsBase64(projectPath: string, kind: 'character' | 'costume', filename: string): Promise<{ mime: string; data: string }> {
  const p = path.join(projectPath, 'refs', kind, filename)
  const buf = await fs.readFile(p)
  const ext = path.extname(filename).slice(1).toLowerCase()
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
  return { mime, data: buf.toString('base64') }
}
