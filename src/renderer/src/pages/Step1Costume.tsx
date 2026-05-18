import { useNavigate } from 'react-router-dom'
import { useProject, saveProject } from '../services/store'
import TagInput from '../components/TagInput'
import ImageDropzone from '../components/ImageDropzone'
import ConceptCard from '../components/ConceptCard'
import { Sparkles, ArrowRight, AlertCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export default function Step1Costume() {
  const nav = useNavigate()
  const { projectPath, data, updateData } = useProject()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<number | null>(null)
  const requestIdRef = useRef<string>('')

  useEffect(() => {
    const unsub = window.api.claude.onChunk(p => {
      if (p.requestId !== requestIdRef.current) return
      setProgress(`接收中... 已 ${p.accumulated.length} 字`)
    })
    return () => { unsub() }
  }, [])

  useEffect(() => {
    return () => { if (timerRef.current) window.clearInterval(timerRef.current) }
  }, [])

  if (!projectPath || !data) {
    return <div className="p-8 text-ink2">未打开项目，请回到首页。</div>
  }

  // 防御性 normalize：兼容旧版 project.json 缺字段的情况（HMR 不重跑 setProject）
  const rawStep1 = data.step1 ?? ({} as any)
  const step1 = {
    lyrics: rawStep1.lyrics ?? '',
    mood: rawStep1.mood ?? '',
    elements: rawStep1.elements ?? [],
    characterRefs: rawStep1.characterRefs ?? [],
    faceAnalysis: rawStep1.faceAnalysis ?? null,
    concepts: rawStep1.concepts ?? [],
    selectedConceptId: rawStep1.selectedConceptId ?? null
  }

  async function generate() {
    if (!step1.lyrics.trim()) { setError('请先填写歌词'); return }
    setError(''); setGenerating(true); setProgress('启动 Claude CLI...')
    const reqId = `step1-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    requestIdRef.current = reqId
    const t0 = Date.now()
    setElapsed(0)
    timerRef.current = window.setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000)
    try {
      const r = await window.api.claude.generateConcepts({
        projectPath: projectPath!,
        lyrics: step1.lyrics,
        mood: step1.mood,
        elements: step1.elements,
        characterRefIds: step1.characterRefs.map(x => x.id),
        requestId: reqId
      } as any)
      if (!r.ok) { setError(r.message || '生成失败'); return }
      updateData(d => {
        d.step1.faceAnalysis = r.data.face_analysis
        d.step1.concepts = r.data.concepts
        d.step1.selectedConceptId = null
      })
      await saveProject()
      setProgress('')
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setGenerating(false)
      if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null }
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Sparkles className="text-accent" size={22}/> 第一步 · 服化道场景设计</h1>
        <p className="text-sm text-ink2 mt-1">输入歌词、情调、可选元素，并上传角色参考照（仅用于分析气质适配性），AI 将输出三个差异化的服化道方案。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
        <div className="card space-y-4">
          <div>
            <label className="label">歌词 <span className="text-red-400">*</span></label>
            <textarea
              className="input min-h-[200px] resize-y leading-relaxed text-sm"
              placeholder="粘贴完整歌词，分段空行更利于后续分镜节奏感"
              value={step1.lyrics}
              onChange={e => updateData(d => { d.step1.lyrics = e.target.value })}
            />
          </div>

          <div>
            <label className="label">情调基调 / 歌曲含义</label>
            <textarea
              className="input min-h-[64px] resize-y text-sm"
              placeholder="例如：怀旧、克制、舞步退却的告别；或一段对歌曲内核的描述"
              value={step1.mood}
              onChange={e => updateData(d => { d.step1.mood = e.target.value })}
            />
          </div>

          <div>
            <label className="label">指定元素（可选）</label>
            <TagInput
              value={step1.elements}
              onChange={v => updateData(d => { d.step1.elements = v })}
              placeholder="海边、复古相机、青春感… 回车 / 逗号 添加"
            />
          </div>

          <div>
            <label className="label">角色参考照（可选）</label>
            <ImageDropzone
              projectPath={projectPath}
              kind="character"
              labelPrefix="角色参考图"
              refs={step1.characterRefs}
              onChange={v => updateData(d => { d.step1.characterRefs = v })}
              hint="用于分析脸型、肤色、气质适配 - 不输出身份相关描述"
            />
          </div>

          <button className="btn-primary w-full justify-center" disabled={generating} onClick={generate}>
            {generating ? <>生成中… {elapsed}s</> : <><Sparkles size={16}/> 生成 3 个方案</>}
          </button>
          {generating && (
            <div className="text-xs text-ink2 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse"></span>
              {progress || '调用中...'}（详情见右下角 ⌨ 调试面板）
            </div>
          )}
          {error && <div className="flex items-start gap-2 text-sm text-red-400"><AlertCircle size={14} className="mt-0.5"/> {error}</div>}
        </div>

        <div className="space-y-4">
          {step1.concepts.length === 0 ? (
            <div className="card text-center text-ink2 py-16">
              点击左侧"生成 3 个方案"开始。
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {step1.concepts.map((c, i) => (
                <ConceptCard
                  key={c.id ?? i}
                  index={i}
                  concept={c}
                  selected={step1.selectedConceptId === c.id}
                  onSelect={() => updateData(d => { d.step1.selectedConceptId = c.id })}
                />
              ))}
            </div>
          )}

          {step1.selectedConceptId && (
            <div className="flex justify-end">
              <button className="btn-primary" onClick={() => nav('/step2')}>
                进入第二步 · 分镜生成 <ArrowRight size={14}/>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
