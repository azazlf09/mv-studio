import { Check, Copy, Sparkles } from 'lucide-react'
import type { ConceptDesign } from '../../../shared/schema'
import clsx from 'clsx'
import { useState } from 'react'

function asStr(v: any): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return v.map(asStr).join('、')
  if (typeof v === 'object') return Object.entries(v).map(([k, val]) => `${k}：${asStr(val)}`).join('；')
  return String(v)
}

export default function ConceptCard({
  concept, selected, onSelect, index
}: { concept: ConceptDesign; selected: boolean; onSelect: () => void; index: number }) {
  const [copied, setCopied] = useState(false)
  const aiPrompt = asStr(concept.ai_image_prompt)
  const theme = asStr(concept.theme_name)
  const promptLen = aiPrompt.length

  function copy() {
    if (!aiPrompt) return
    navigator.clipboard.writeText(aiPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={clsx(
      'card flex flex-col gap-4 transition',
      selected ? 'border-accent ring-1 ring-accent/40' : 'hover:border-border'
    )}>
      {/* 标题行 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-accent font-semibold whitespace-nowrap">提示词方案 {index + 1}</span>
          {theme && (
            <>
              <span className="text-ink2">·</span>
              <span className="text-ink truncate">{theme}</span>
            </>
          )}
        </div>
        <button
          onClick={onSelect}
          className={clsx(
            'btn shrink-0',
            selected ? 'bg-accent text-bg border-accent hover:bg-accent' : ''
          )}
        >
          {selected ? <><Check size={14}/> 已选定</> : <>选为定妆方案</>}
        </button>
      </div>

      {/* AI 提示词 —— 主角 */}
      <div className="rounded-lg border border-accent/40 bg-accent/[0.04] p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-accent text-sm font-medium">
            <Sparkles size={14}/> AI 出图提示词
            {promptLen > 0 && <span className="text-ink2 text-xs font-normal">· {promptLen} 字</span>}
          </div>
          <button
            onClick={copy}
            disabled={!aiPrompt}
            className={clsx('btn-ghost text-xs', !aiPrompt && 'opacity-40 cursor-not-allowed')}
          >
            {copied ? <><Check size={12}/> 已复制</> : <><Copy size={12}/> 复制</>}
          </button>
        </div>
        {aiPrompt ? (
          <div className="text-[15px] leading-relaxed text-ink whitespace-pre-wrap select-text">
            {aiPrompt}
          </div>
        ) : (
          <div className="text-sm text-red-400/80">⚠ 模型未返回 ai_image_prompt 字段（详情见调试面板）</div>
        )}
      </div>

      {/* 细节参考 —— 可读但不抢戏 */}
      <details className="text-sm" open>
        <summary className="text-ink2 text-xs cursor-pointer select-none hover:text-ink/80">细节参考（妆 / 发 / 服 / 场景）</summary>
        <dl className="mt-2 grid grid-cols-1 gap-y-1.5">
          <Row label="妆容" v={asStr(concept.makeup)} />
          <Row label="发型" v={asStr(concept.hairstyle)} />
          <Row label="服装" v={asStr(concept.outfit)} />
          <Row label="配饰" v={asStr(concept.accessories)} />
          <Row label="场景" v={asStr(concept.scene_atmosphere)} />
        </dl>
      </details>
    </div>
  )
}

function Row({ label, v }: { label: string; v: string }) {
  if (!v) return null
  return (
    <div className="grid grid-cols-[44px_1fr] gap-2">
      <dt className="text-ink2 text-xs pt-0.5">{label}</dt>
      <dd className="text-ink/90 text-[13px] whitespace-pre-wrap leading-relaxed">{v}</dd>
    </div>
  )
}
