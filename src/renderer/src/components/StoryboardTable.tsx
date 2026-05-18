import type { Storyboard } from '../../../shared/schema'
import { SHOT_SIZES, ANGLES, CAMERA_MOVEMENTS, PERSPECTIVES } from '../../../shared/schema'
import { renderStoryboardLine } from '../services/promptRenderer'
import { Copy, Trash2, Check, Plus, ChevronDown, ChevronRight, Copy as CopyAll } from 'lucide-react'
import { useState } from 'react'

type Props = {
  storyboards: Storyboard[]
  availableRefs: string[]
  onChange: (next: Storyboard[]) => void
}

export default function StoryboardTable({ storyboards, availableRefs, onChange }: Props) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState<Set<number>>(new Set())

  function update(i: number, patch: Partial<Storyboard>) {
    const next = storyboards.map((sb, idx) => idx === i ? { ...sb, ...patch } : sb)
    onChange(next.map((sb, idx) => ({ ...sb, index: idx + 1 })))
  }

  function remove(i: number) {
    onChange(storyboards.filter((_, idx) => idx !== i).map((sb, idx) => ({ ...sb, index: idx + 1 })))
  }

  function addBlank() {
    onChange([
      ...storyboards,
      {
        index: storyboards.length + 1,
        lyric: '',
        shot_size: '中景',
        angle: '正面',
        camera_movement: '固定机位',
        perspective: '第三人称视角',
        ref_images: [],
        audio_ref: '演唱音频1',
        scene_description: ''
      }
    ])
  }

  function toggleRef(i: number, label: string) {
    const cur = storyboards[i].ref_images || []
    const next = cur.includes(label) ? cur.filter(x => x !== label) : [...cur, label]
    update(i, { ref_images: next })
  }

  function toggleExpand(i: number) {
    const next = new Set(expandedIdx)
    if (next.has(i)) next.delete(i); else next.add(i)
    setExpandedIdx(next)
  }

  function copyLine(i: number) {
    navigator.clipboard.writeText(renderStoryboardLine(storyboards[i]))
    setCopiedIdx(i)
    setTimeout(() => setCopiedIdx(null), 1200)
  }

  function copyAll() {
    const text = storyboards.map(renderStoryboardLine).join('\n\n')
    navigator.clipboard.writeText(text)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 1500)
  }

  if (storyboards.length === 0) {
    return (
      <div className="card text-center text-ink2 py-12">
        尚未生成分镜。点击上方"生成分镜表"开始。
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-ink2">共 {storyboards.length} 条分镜提示词 · 点击右侧"复制"按钮可直接粘贴去生图</div>
        <button onClick={copyAll} className="btn !py-1 text-xs">
          {copiedAll ? <><Check size={12}/> 已复制全部</> : <><CopyAll size={12}/> 一键复制全部</>}
        </button>
      </div>

      {storyboards.map((sb, i) => {
        const expanded = expandedIdx.has(i)
        const rendered = renderStoryboardLine(sb)
        return (
          <div key={i} className="card !p-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-panel2 text-accent font-semibold flex items-center justify-center shrink-0 text-sm">
                {sb.index}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-[15px] leading-relaxed font-mono text-ink whitespace-pre-wrap break-words select-text">
                  {rendered}
                </div>
                <button
                  onClick={() => toggleExpand(i)}
                  className="mt-2 text-xs text-ink2 hover:text-accent flex items-center gap-1"
                >
                  {expanded ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                  {expanded ? '收起编辑' : '编辑此条'}
                </button>

                {expanded && (
                  <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                    <div>
                      <div className="text-xs text-ink2 mb-1">歌词</div>
                      <textarea
                        value={sb.lyric}
                        onChange={e => update(i, { lyric: e.target.value })}
                        placeholder="对应歌词"
                        rows={2}
                        className="input !py-1.5 text-sm w-full"
                      />
                    </div>

                    <div>
                      <div className="text-xs text-ink2 mb-1">画面描述（方括号内）</div>
                      <textarea
                        value={sb.scene_description}
                        onChange={e => update(i, { scene_description: e.target.value })}
                        placeholder="30-60 字：环境光线 / 动作 / 情绪 / 视觉焦点"
                        rows={3}
                        className="input !py-1.5 text-sm w-full"
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <Select label="景别" value={sb.shot_size} options={SHOT_SIZES as unknown as string[]} onChange={v => update(i, { shot_size: v })} />
                      <Select label="角度" value={sb.angle} options={ANGLES as unknown as string[]} onChange={v => update(i, { angle: v })} />
                      <Select label="运镜" value={sb.camera_movement} options={CAMERA_MOVEMENTS as unknown as string[]} onChange={v => update(i, { camera_movement: v })} />
                      <Select label="视角" value={sb.perspective} options={PERSPECTIVES as unknown as string[]} onChange={v => update(i, { perspective: v })} />
                    </div>

                    <div>
                      <div className="text-xs text-ink2 mb-1">关联参考图</div>
                      <div className="flex flex-wrap gap-1">
                        {availableRefs.length === 0 && <span className="text-xs text-ink2/70">（请先在上方上传参考图）</span>}
                        {availableRefs.map(r => {
                          const on = (sb.ref_images || []).includes(r)
                          return (
                            <button
                              key={r}
                              onClick={() => toggleRef(i, r)}
                              className={`px-2 py-0.5 rounded text-xs border transition ${on ? 'bg-accent text-bg border-accent' : 'bg-panel2 border-border text-ink2 hover:text-ink'}`}
                            >
                              {r}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5 shrink-0">
                <button onClick={() => copyLine(i)} className="btn !py-1 !px-2.5 text-xs bg-accent/10 border-accent/40 text-accent hover:bg-accent hover:text-bg">
                  {copiedIdx === i ? <><Check size={12}/> 已复制</> : <><Copy size={12}/> 复制</>}
                </button>
                <button onClick={() => remove(i)} className="btn !py-1 !px-2 text-xs hover:bg-red-900 hover:border-red-700">
                  <Trash2 size={12}/>
                </button>
              </div>
            </div>
          </div>
        )
      })}

      <button onClick={addBlank} className="btn w-full">
        <Plus size={14}/> 追加一行分镜
      </button>
    </div>
  )
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-[11px] text-ink2 mb-1">{label}</div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input !py-1 text-xs w-full"
      >
        {!options.includes(value) && <option value={value}>{value}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
