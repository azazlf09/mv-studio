import { useEffect, useRef, useState } from 'react'
import { Terminal, X, Copy, Trash2, ChevronDown, Pause, Play } from 'lucide-react'

type LogEvent = {
  ts: number
  level: 'debug' | 'info' | 'warn' | 'error'
  scope: string
  message: string
  data?: any
}

const LEVEL_COLORS: Record<string, string> = {
  debug: 'text-ink2',
  info: 'text-sky-400',
  warn: 'text-amber-400',
  error: 'text-red-400'
}

const LEVEL_BG: Record<string, string> = {
  debug: 'bg-white/5',
  info: 'bg-sky-500/10',
  warn: 'bg-amber-500/10',
  error: 'bg-red-500/15'
}

function formatData(data: any): string {
  if (data === undefined) return ''
  if (typeof data === 'string') return data
  try { return JSON.stringify(data) } catch { return String(data) }
}

function levelMatches(lvl: string, filter: string) {
  if (filter === 'all') return true
  if (filter === 'info+') return lvl !== 'debug'
  if (filter === 'warn+') return lvl === 'warn' || lvl === 'error'
  if (filter === 'error') return lvl === 'error'
  return true
}

export default function DebugDrawer() {
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState<LogEvent[]>([])
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState<'all' | 'info+' | 'warn+' | 'error'>('info+')
  const [scopeFilter, setScopeFilter] = useState<string>('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const [unread, setUnread] = useState(0)
  const [handlerMissing, setHandlerMissing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  useEffect(() => {
    // load backlog
    window.api.debug.getHistory()
      .then((arr: LogEvent[]) => { setEvents(arr); setHandlerMissing(false) })
      .catch((err: any) => {
        const msg = String(err?.message || err)
        if (msg.includes('No handler registered')) {
          setHandlerMissing(true)
        } else {
          console.warn('[DebugDrawer] getHistory failed:', msg)
        }
      })
    const unsub = window.api.debug.onLog((evt: LogEvent) => {
      if (pausedRef.current) return
      setEvents(prev => {
        const next = [...prev, evt]
        if (next.length > 1000) next.splice(0, next.length - 1000)
        return next
      })
      if (!open && (evt.level === 'error' || evt.level === 'warn')) {
        setUnread(n => n + 1)
      } else if (!open) {
        setUnread(n => n + 1)
      }
    })
    return () => { unsub() }
  }, [open])

  useEffect(() => {
    if (open) setUnread(0)
  }, [open])

  useEffect(() => {
    if (autoScroll && open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events, autoScroll, open])

  const scopes = Array.from(new Set(events.map(e => e.scope))).sort()
  const visible = events.filter(e => levelMatches(e.level, filter) && (scopeFilter === 'all' || e.scope === scopeFilter))

  async function copyAll() {
    const txt = visible.map(e => {
      const t = new Date(e.ts).toLocaleTimeString()
      const d = formatData(e.data)
      return `[${t}] [${e.level.toUpperCase()}] [${e.scope}] ${e.message}${d ? '  ' + d : ''}`
    }).join('\n')
    try {
      await navigator.clipboard.writeText(txt)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = txt
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove()
    }
  }

  async function clearLogs() {
    setEvents([])
    await window.api.debug.clear()
  }

  return (
    <>
      {/* 悬浮按钮 */}
      <button
        className="fixed bottom-4 right-4 z-50 bg-bg2 border border-line shadow-lg rounded-full w-12 h-12 flex items-center justify-center text-ink2 hover:text-accent hover:border-accent transition"
        title="调试日志面板 (Ctrl+`)"
        onClick={() => setOpen(o => !o)}
      >
        <Terminal size={18} />
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* 抽屉 */}
      <div
        className={`fixed left-0 right-0 bottom-0 z-40 bg-bg2 border-t border-line shadow-2xl transition-transform duration-200 ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ height: '45vh', maxHeight: '600px' }}
      >
        <div className="flex items-center gap-2 px-4 py-2 border-b border-line bg-bg1">
          <Terminal size={14} className="text-accent" />
          <h3 className="font-medium text-sm">后台运行日志 <span className="text-ink2 text-xs">({visible.length}/{events.length})</span></h3>

          <div className="flex items-center gap-2 ml-4 text-xs">
            <span className="text-ink2">级别：</span>
            <select className="bg-bg2 border border-line rounded px-1.5 py-0.5" value={filter} onChange={e => setFilter(e.target.value as any)}>
              <option value="all">全部</option>
              <option value="info+">info 及以上</option>
              <option value="warn+">warn 及以上</option>
              <option value="error">仅 error</option>
            </select>

            <span className="text-ink2 ml-2">范围：</span>
            <select className="bg-bg2 border border-line rounded px-1.5 py-0.5" value={scopeFilter} onChange={e => setScopeFilter(e.target.value)}>
              <option value="all">全部</option>
              {scopes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex-1" />

          <label className="flex items-center gap-1 text-xs text-ink2">
            <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} />自动滚动
          </label>
          <button className="text-xs px-2 py-1 rounded hover:bg-white/5" onClick={() => setPaused(p => !p)} title={paused ? '继续接收' : '暂停接收'}>
            {paused ? <Play size={12} className="inline" /> : <Pause size={12} className="inline" />}
            <span className="ml-1">{paused ? '已暂停' : '运行中'}</span>
          </button>
          <button className="text-xs px-2 py-1 rounded hover:bg-white/5" onClick={copyAll} title="复制可见日志">
            <Copy size={12} className="inline" /> 复制
          </button>
          <button className="text-xs px-2 py-1 rounded hover:bg-white/5 text-red-400" onClick={clearLogs} title="清空">
            <Trash2 size={12} className="inline" /> 清空
          </button>
          <button className="text-xs px-2 py-1 rounded hover:bg-white/5" onClick={() => setOpen(false)} title="关闭">
            <ChevronDown size={14} className="inline" />
          </button>
        </div>

        <div ref={scrollRef} className="overflow-auto h-[calc(100%-40px)] px-2 py-1 font-mono text-[11px] leading-relaxed">
          {handlerMissing ? (
            <div className="text-center py-12 text-sm font-sans space-y-3">
              <div className="text-amber-400 text-base font-medium">⚠ 调试系统未加载</div>
              <div className="text-ink2 max-w-md mx-auto leading-relaxed">
                Electron 主进程是在更新前启动的，新的调试 handler 还没生效。<br/>
                <span className="text-ink">请完全关闭当前 CMD 窗口，然后双击桌面 <b>MV制作</b> 图标重新启动 APP。</span>
              </div>
              <div className="text-ink2 text-xs">（仅 renderer 热更新无法刷新 main 进程代码）</div>
            </div>
          ) : visible.length === 0 ? (
            <div className="text-ink2 text-center py-12 text-sm font-sans">暂无日志。点击"生成方案"或"测试连接"会有 CLI 实时输出。</div>
          ) : visible.map((e, i) => {
            const t = new Date(e.ts).toLocaleTimeString()
            const dataStr = formatData(e.data)
            return (
              <div key={i} className={`px-2 py-0.5 rounded ${LEVEL_BG[e.level] || ''} mb-0.5 flex gap-2`}>
                <span className="text-ink2 shrink-0">{t}</span>
                <span className={`shrink-0 w-12 ${LEVEL_COLORS[e.level]}`}>{e.level.toUpperCase()}</span>
                <span className="shrink-0 w-16 text-accent2">[{e.scope}]</span>
                <span className="flex-1 whitespace-pre-wrap break-all">{e.message}{dataStr && <span className="text-ink2 ml-2">{dataStr}</span>}</span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
