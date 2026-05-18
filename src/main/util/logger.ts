import { BrowserWindow } from 'electron'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogEvent = {
  ts: number
  level: LogLevel
  scope: string
  message: string
  data?: any
}

const RING_SIZE = 800
const ring: LogEvent[] = []
let seq = 0

function broadcast(evt: LogEvent) {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) {
      w.webContents.send('debug:log', evt)
    }
  }
}

export function logEvent(scope: string, level: LogLevel, message: string, data?: any) {
  const evt: LogEvent = { ts: Date.now() + (seq++ % 1000) / 1000, level, scope, message, data }
  ring.push(evt)
  if (ring.length > RING_SIZE) ring.shift()
  const prefix = `[${new Date(evt.ts).toLocaleTimeString()}] [${level.toUpperCase()}] [${scope}]`
  if (data !== undefined) {
    // keep console output compact
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data)
    console.log(prefix, message, dataStr.length > 200 ? dataStr.slice(0, 200) + '…' : dataStr)
  } else {
    console.log(prefix, message)
  }
  broadcast(evt)
}

export const log = {
  debug: (scope: string, msg: string, data?: any) => logEvent(scope, 'debug', msg, data),
  info: (scope: string, msg: string, data?: any) => logEvent(scope, 'info', msg, data),
  warn: (scope: string, msg: string, data?: any) => logEvent(scope, 'warn', msg, data),
  error: (scope: string, msg: string, data?: any) => logEvent(scope, 'error', msg, data)
}

export function getHistory(): LogEvent[] {
  return ring.slice()
}

export function clearHistory() {
  ring.length = 0
}
