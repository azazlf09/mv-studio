import { app, BrowserWindow, Menu, shell, globalShortcut } from 'electron'
import path from 'path'
import { registerSettingsHandlers } from './ipc/settings'
import { registerProjectHandlers } from './ipc/projectIO'
import { registerClaudeHandlers } from './ipc/claudeProxy'
import { registerDebugHandlers } from './ipc/debug'
import { registerAppHandlers } from './ipc/app'

const isDev = !app.isPackaged
// 显式打开 DevTools 的开关：dev 模式默认关，需要时设环境变量 MV_DEVTOOLS=1
const wantDevTools = process.env.MV_DEVTOOLS === '1'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 760,
    title: 'MV Studio · 服化道与分镜提示词工坊',
    backgroundColor: '#0f1115',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    if (wantDevTools) mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

/** 注册全局快捷键：Ctrl+Shift+I 切 DevTools；Ctrl+` 切调试抽屉 */
function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const wc = mainWindow.webContents
      if (wc.isDevToolsOpened()) wc.closeDevTools()
      else wc.openDevTools({ mode: 'detach' })
    }
  })
  // Ctrl+` 让 renderer 自己处理（通过 IPC 转发），避免占用全局快捷键
  globalShortcut.register('CommandOrControl+`', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:toggle-debug-drawer')
    }
  })
}

app.whenReady().then(() => {
  registerSettingsHandlers()
  registerProjectHandlers()
  registerClaudeHandlers()
  registerDebugHandlers()
  registerAppHandlers()
  Menu.setApplicationMenu(null)
  createWindow()
  registerShortcuts()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
