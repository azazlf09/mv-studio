import { app, ipcMain, shell } from 'electron'
import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { buildDemoProjectData } from '../../shared/demoProject'
import { log } from '../util/logger'

/** 跑 `claude --version`，3 秒超时；返回是否能用 + 版本号 + 实际路径 */
function detectClaudeCli(cliPath?: string): Promise<{ found: boolean; version?: string; path?: string; error?: string }> {
  return new Promise(resolve => {
    const bin = cliPath?.trim() || 'claude'
    let stdout = ''
    let stderr = ''
    let done = false
    const finish = (r: { found: boolean; version?: string; path?: string; error?: string }) => {
      if (done) return
      done = true
      resolve(r)
    }
    try {
      const child = spawn(bin, ['--version'], { shell: true, windowsHide: true })
      child.stdout.on('data', d => { stdout += d.toString() })
      child.stderr.on('data', d => { stderr += d.toString() })
      child.on('error', err => finish({ found: false, error: err.message }))
      child.on('close', code => {
        const out = (stdout + stderr).trim()
        if (code === 0 && out) {
          // 典型输出："2.1.131 (Claude Code)"，取第一段
          const m = out.match(/(\d+\.\d+\.\d+[^\s]*)/)
          finish({ found: true, version: m?.[1] ?? out.slice(0, 80), path: bin })
        } else {
          finish({ found: false, error: out || `exit ${code}` })
        }
      })
      setTimeout(() => {
        if (!done) {
          try { child.kill() } catch {}
          finish({ found: false, error: '检测超时（3s）' })
        }
      }, 3000)
    } catch (e: any) {
      finish({ found: false, error: e?.message ?? String(e) })
    }
  })
}

export function registerAppHandlers() {
  ipcMain.handle('app:detectCli', async (_e, cliPath?: string) => {
    log.info('app', 'detectCli 开始', { cliPath: cliPath || '(从 PATH)' })
    const r = await detectClaudeCli(cliPath)
    log.info('app', r.found ? `检测到 CLI v${r.version}` : 'CLI 未检测到', r)
    return r
  })

  ipcMain.handle('app:createDemoProject', async (_e, parentDirArg?: string) => {
    try {
      const parentDir = parentDirArg && parentDirArg.trim() ? parentDirArg : app.getPath('documents')
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
      const projectPath = path.join(parentDir, `MV-Studio-示例-${stamp}`)
      const id = randomUUID()
      const data = buildDemoProjectData(id)
      await fs.mkdir(projectPath, { recursive: true })
      await fs.mkdir(path.join(projectPath, 'refs', 'character'), { recursive: true })
      await fs.mkdir(path.join(projectPath, 'refs', 'costume'), { recursive: true })
      await fs.writeFile(
        path.join(projectPath, 'project.json'),
        JSON.stringify(data, null, 2),
        'utf-8'
      )
      // 同步到 recents
      const recentsFile = path.join(app.getPath('userData'), 'recentProjects.json')
      let recents: any[] = []
      try { recents = JSON.parse(await fs.readFile(recentsFile, 'utf-8')) } catch {}
      recents = recents.filter(r => r.path !== projectPath)
      recents.unshift({
        id: data.meta.id,
        name: data.meta.name,
        path: projectPath,
        lastOpened: new Date().toISOString()
      })
      await fs.mkdir(path.dirname(recentsFile), { recursive: true })
      await fs.writeFile(recentsFile, JSON.stringify(recents.slice(0, 50), null, 2), 'utf-8')

      log.info('app', '创建示例项目成功', { projectPath })
      return { ok: true, projectPath, data }
    } catch (e: any) {
      log.error('app', '创建示例项目失败', { message: e?.message })
      return { ok: false, message: e?.message ?? String(e) }
    }
  })

  ipcMain.handle('app:openExternal', async (_e, url: string) => {
    if (!url || typeof url !== 'string') return
    if (!/^https?:\/\//i.test(url)) return
    await shell.openExternal(url)
  })
}
