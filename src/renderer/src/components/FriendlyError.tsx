import { useState } from 'react'
import { AlertCircle, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { classifyError } from '../../../shared/errorMap'

export default function FriendlyError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const nav = useNavigate()
  const [showDetail, setShowDetail] = useState(false)
  const info = classifyError(error)
  const raw = String((error as any)?.message ?? error ?? '')

  return (
    <div className="border border-red-500/40 bg-red-500/5 rounded-lg p-4 my-3">
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-red-200">{info.title}</div>
          <div className="text-sm text-ink2 mt-1 leading-relaxed">{info.hint}</div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            {info.action?.route && (
              <button
                className="btn text-xs"
                onClick={() => nav(info.action!.route!)}
              >
                {info.action.label}
              </button>
            )}
            {info.action?.external && (
              <button
                className="btn text-xs"
                onClick={() => window.api.app.openExternal(info.action!.external!)}
              >
                <ExternalLink size={12} /> {info.action.label}
              </button>
            )}
            {onRetry && (
              <button className="btn text-xs" onClick={onRetry}>重试</button>
            )}
            <button
              className="btn-ghost text-xs"
              onClick={() => setShowDetail(s => !s)}
            >
              {showDetail ? <ChevronDown size={12}/> : <ChevronRight size={12}/>} 技术详情
            </button>
          </div>

          {showDetail && (
            <pre className="mt-3 text-[11px] bg-bg/60 border border-border rounded p-2 font-mono whitespace-pre-wrap break-all max-h-48 overflow-auto text-ink2">
{raw || '(无原始错误信息)'}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
