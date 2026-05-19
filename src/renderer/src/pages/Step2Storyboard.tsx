import { useEffect, useRef, useState } from 'react'
import { useProject, saveProject } from '../services/store'
import ImageDropzone from '../components/ImageDropzone'
import StoryboardTable from '../components/StoryboardTable'
import { Clapperboard, Download, FileText, FileCode } from 'lucide-react'
import { exportTxt, exportMd } from '../services/promptRenderer'
import FriendlyError from '../components/FriendlyError'

export default function Step2Storyboard() {
  const { projectPath, data, updateData } = useProject()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [streamPreview, setStreamPreview] = useState('')
  const reqIdRef = useRef<string>('')

  useEffect(() => {
    const offChunk = window.api.claude.onChunk(p => {
      if (p.requestId === reqIdRef.current) setStreamPreview(p.accumulated)
    })
    const offDone = window.api.claude.onDone(p => {
      if (p.requestId === reqIdRef.current) {
        updateData(d => { d.step2.storyboards = p.data })
        saveProject()
        setStreamPreview('')
        setGenerating(false)
      }
    })
    const offErr = window.api.claude.onError(p => {
      if (p.requestId === reqIdRef.current) {
        setError(p.message)
        setGenerating(false)
      }
    })
    return () => { offChunk(); offDone(); offErr() }
  }, [updateData])

  if (!projectPath || !data) {
    return <div className="p-8 text-ink2">未打开项目，请回到首页。</div>
  }

  // 防御性 normalize：兼容旧版 project.json 缺字段的情况
  const rawStep1 = data.step1 ?? ({} as any)
  const rawStep2 = data.step2 ?? ({} as any)
  const step1 = {
    lyrics: rawStep1.lyrics ?? '',
    mood: rawStep1.mood ?? '',
    elements: rawStep1.elements ?? [],
    characterRefs: rawStep1.characterRefs ?? [],
    faceAnalysis: rawStep1.faceAnalysis ?? null,
    concepts: rawStep1.concepts ?? [],
    selectedConceptId: rawStep1.selectedConceptId ?? null
  }
  const step2 = {
    costumeRefs: rawStep2.costumeRefs ?? [],
    storyboards: rawStep2.storyboards ?? []
  }
  const selectedConcept = step1.concepts.find(c => c.id === step1.selectedConceptId) ?? null
  const availableRefs = step2.costumeRefs.map(r => r.label)

  async function generate() {
    if (!step1.lyrics) { setError('歌词为空，请回到第一步填写'); return }
    setError(''); setGenerating(true); setStreamPreview('')
    const requestId = crypto.randomUUID()
    reqIdRef.current = requestId
    try {
      await window.api.claude.generateStoryboards({
        projectPath: projectPath!,
        lyrics: step1.lyrics,
        mood: step1.mood,
        elements: step1.elements,
        selectedConcept,
        costumeRefs: step2.costumeRefs.map(r => ({ id: r.id, label: r.label })),
        requestId
      })
    } catch (e: any) {
      setError(e?.message ?? String(e))
      setGenerating(false)
    }
  }

  async function doExport(format: 'txt' | 'md' | 'json') {
    if (step2.storyboards.length === 0) return
    const content =
      format === 'txt' ? exportTxt(step2.storyboards) :
      format === 'md' ? exportMd(step2.storyboards) :
      JSON.stringify(step2.storyboards, null, 2)
    const name = `${data.meta.name}-分镜表.${format}`
    await window.api.export.text({ defaultName: name, content, ext: format })
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Clapperboard className="text-accent" size={22}/> 第二步 · 分镜提示词
          </h1>
          <p className="text-sm text-ink2 mt-1">按歌词逐句生成可直接复制去生图的画面提示词。每条 = 景别角度 + 运镜视角 + 参考图 + 【画面描述】+ 歌词。</p>
        </div>
        {step2.storyboards.length > 0 && (
          <div className="flex items-center gap-2">
            <button className="btn" onClick={() => doExport('txt')}><FileText size={14}/> 导出 .txt</button>
            <button className="btn" onClick={() => doExport('md')}><FileCode size={14}/> 导出 .md</button>
            <button className="btn" onClick={() => doExport('json')}><Download size={14}/> 导出 .json</button>
          </div>
        )}
      </div>

      <div className="card mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-ink2 mb-1">歌词（来自第一步）</div>
          <div className="text-sm text-ink/90 whitespace-pre-wrap max-h-[120px] overflow-auto leading-relaxed">{step1.lyrics || '（未填写）'}</div>
        </div>
        <div>
          <div className="text-xs text-ink2 mb-1">已选定方案</div>
          {selectedConcept ? (
            <div className="text-sm">
              <span className="text-accent font-medium">{selectedConcept.theme_name}</span>
              <span className="text-ink2 text-xs ml-2">· {selectedConcept.style_direction}</span>
              <div className="text-xs text-ink2 mt-1 line-clamp-2">{selectedConcept.overall_description}</div>
            </div>
          ) : (
            <div className="text-sm text-yellow-300">尚未在第一步选定方案（仍可生成，但 AI 缺少服化道上下文）</div>
          )}
          {step1.elements.length > 0 && (
            <div className="text-xs text-ink2 mt-2">指定元素：{step1.elements.join('、')}</div>
          )}
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-sm">上传定妆 / 服装场景参考图</h3>
          <span className="text-xs text-ink2">编号即提示词中的"人物参考图1 / 服装场景参考图2"。建议命名为人物或服装两种类型分别上传。</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-ink2 mb-1.5">人物参考图</div>
            <ImageDropzone
              projectPath={projectPath}
              kind="costume"
              labelPrefix="人物参考图"
              refs={step2.costumeRefs.filter(r => r.label.startsWith('人物'))}
              onChange={persons => {
                const others = step2.costumeRefs.filter(r => !r.label.startsWith('人物'))
                updateData(d => { d.step2.costumeRefs = [...persons, ...others] })
              }}
            />
          </div>
          <div>
            <div className="text-xs text-ink2 mb-1.5">服装场景参考图</div>
            <ImageDropzone
              projectPath={projectPath}
              kind="costume"
              labelPrefix="服装场景参考图"
              refs={step2.costumeRefs.filter(r => r.label.startsWith('服装'))}
              onChange={scenes => {
                const others = step2.costumeRefs.filter(r => !r.label.startsWith('服装'))
                updateData(d => { d.step2.costumeRefs = [...others, ...scenes] })
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <button className="btn-primary" disabled={generating} onClick={generate}>
          {generating ? '生成中…' : <><Clapperboard size={16}/> 生成分镜表</>}
        </button>
        {generating && <span className="text-xs text-ink2">已接收 {streamPreview.length} 字符…</span>}
      </div>
      {error && <FriendlyError error={error} onRetry={generate} />}

      {generating && streamPreview && (
        <div className="card mb-4 max-h-[200px] overflow-auto text-xs font-mono text-ink2 whitespace-pre-wrap break-all">
          {streamPreview}
        </div>
      )}

      <StoryboardTable
        storyboards={step2.storyboards}
        availableRefs={availableRefs}
        onChange={next => updateData(d => { d.step2.storyboards = next })}
      />
    </div>
  )
}
