import { ipcMain } from 'electron'
import { getHistory, clearHistory } from '../util/logger'

export function registerDebugHandlers() {
  ipcMain.handle('debug:getHistory', async () => {
    return getHistory()
  })
  ipcMain.handle('debug:clear', async () => {
    clearHistory()
    return { ok: true }
  })
}
