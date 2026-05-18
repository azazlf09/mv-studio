import { ipcMain, BrowserWindow } from 'electron'
import { IPC, GenerateConceptsArgs, GenerateStoryboardsArgs } from '../../shared/ipcChannels'
import { STEP1_SYSTEM_PROMPT, STEP2_SYSTEM_PROMPT } from '../../shared/prompts'
import { getSettings } from './settings'
import { loadImageAsBase64 } from './projectIO'
import { promises as fs } from 'fs'
import path from 'path'
import { ProjectData } from '../../shared/schema'
import { createProvider, ContentPart } from '../providers'
import { log } from '../util/logger'

async function loadProjectImages(projectPath: string, kind: 'character' | 'costume', ids: string[]) {
  const raw = await fs.readFile(path.join(projectPath, 'project.json'), 'utf-8')
  const data: ProjectData = JSON.parse(raw)
  const refs = kind === 'character' ? data.step1.characterRefs : data.step2.costumeRefs
  const selected = refs.filter(r => ids.includes(r.id))
  const out: { ref: typeof refs[0]; mime: string; b64: string }[] = []
  for (const r of selected) {
    const { mime, data } = await loadImageAsBase64(projectPath, kind, r.filename)
    out.push({ ref: r, mime, b64: data })
  }
  return out
}

function extractJSON(text: string): any {
  // strip ```json fences if any
  const stripped = text
    .replace(/^[\s\S]*?```(?:json)?\s*/i, m => m.includes('```') ? '' : m)
    .replace(/```[\s\S]*$/, '')

  const candidates = [stripped, text]
  let lastErr: any
  for (const t of candidates) {
    const startObj = t.indexOf('{')
    const startArr = t.indexOf('[')
    let start = -1
    let open: string, close: string
    if (startObj === -1 && startArr === -1) { lastErr = new Error('未找到 JSON'); continue }
    if (startArr === -1 || (startObj !== -1 && startObj < startArr)) {
      start = startObj; open = '{'; close = '}'
    } else {
      start = startArr; open = '['; close = ']'
    }
    let depth = 0, inStr = false, esc = false
    for (let i = start; i < t.length; i++) {
      const c = t[i]
      if (esc) { esc = false; continue }
      if (c === '\\') { esc = true; continue }
      if (c === '"') { inStr = !inStr; continue }
      if (inStr) continue
      if (c === open) depth++
      else if (c === close) {
        depth--
        if (depth === 0) {
          try {
            return JSON.parse(t.slice(start, i + 1))
          } catch (e) { lastErr = e; break }
        }
      }
    }
    if (!lastErr) lastErr = new Error('JSON 未闭合')
  }
  throw lastErr ?? new Error('未找到 JSON')
}

// 中文字段 → 英文字段映射
const CN_KEY_MAP: Record<string, string> = {
  '方案编号': 'id', '编号': 'id',
  '方案名': 'theme_name', '主题名': 'theme_name', '主题': 'theme_name',
  '风格方向': 'style_direction', '风格': 'style_direction',
  '妆容': 'makeup', '化妆': 'makeup',
  '发型': 'hairstyle',
  '服装': 'outfit', '服饰': 'outfit',
  '配饰': 'accessories',
  '场景氛围': 'scene_atmosphere', '场景': 'scene_atmosphere', '氛围': 'scene_atmosphere',
  '色彩方案': 'color_palette', '配色': 'color_palette', '色彩': 'color_palette', '色卡': 'color_palette',
  '整体描述': 'overall_description', '整体': 'overall_description',
  'AI图像提示词': 'ai_image_prompt', '图像提示词': 'ai_image_prompt', 'AI提示词': 'ai_image_prompt', '提示词': 'ai_image_prompt',
  '脸型': 'face_shape', '肤色': 'skin_tone', '气质标签': 'temperament_tags', '气质': 'temperament_tags',
  '气质分析': 'face_analysis',
  // step2 分镜字段
  '序号': 'index', '镜号': 'index',
  '歌词': 'lyric', '歌词片段': 'lyric',
  '景别': 'shot_size', '景别角度': 'shot_size',
  '角度': 'angle', '拍摄角度': 'angle',
  '运镜': 'camera_movement', '运镜方式': 'camera_movement', '镜头运动': 'camera_movement',
  '视角': 'perspective', '运镜视角': 'perspective', '人称视角': 'perspective',
  '参考图': 'ref_images', '关联参考图': 'ref_images', '参考': 'ref_images',
  '音频': 'audio_ref', '音频参考': 'audio_ref', '演唱音频': 'audio_ref',
  '画面描述': 'scene_description', '场景描述': 'scene_description', '描述': 'scene_description'
}

function remapKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(remapKeys)
  if (obj && typeof obj === 'object') {
    const out: any = {}
    for (const [k, v] of Object.entries(obj)) {
      const mapped = CN_KEY_MAP[k] ?? k
      out[mapped] = remapKeys(v)
    }
    return out
  }
  return obj
}

const EMPTY_FACE = { face_shape: '未提供', skin_tone: '未提供', temperament_tags: [] }

/** 强制把任何值转成字符串数组 */
function toStringArray(v: any): string[] {
  if (v == null) return []
  if (Array.isArray(v)) return v.map(x => typeof x === 'string' ? x : (x && typeof x === 'object' ? Object.values(x).filter(y => typeof y === 'string').join(' ') : String(x))).filter(Boolean)
  if (typeof v === 'string') return v.split(/[、,，;；\/\|\s]+/).map(s => s.trim()).filter(Boolean)
  if (typeof v === 'object') return Object.values(v).map(x => typeof x === 'string' ? x : String(x)).filter(Boolean)
  return [String(v)]
}

/** 强制把任何值转成字符串 */
function toStr(v: any): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return v.map(toStr).join('、')
  if (typeof v === 'object') {
    const parts: string[] = []
    for (const [k, val] of Object.entries(v)) parts.push(`${k}：${toStr(val)}`)
    return parts.join('；')
  }
  return String(v)
}

/** 对单个 concept 做字段级 sanitize */
function sanitizeConcept(c: any, idx: number): any {
  if (!c || typeof c !== 'object') c = {}
  return {
    id: typeof c.id === 'number' ? c.id : idx + 1,
    theme_name: toStr(c.theme_name) || `方案 ${idx + 1}`,
    style_direction: toStr(c.style_direction),
    makeup: toStr(c.makeup),
    hairstyle: toStr(c.hairstyle),
    outfit: toStr(c.outfit),
    accessories: toStr(c.accessories),
    scene_atmosphere: toStr(c.scene_atmosphere),
    color_palette: toStringArray(c.color_palette),
    overall_description: toStr(c.overall_description),
    ai_image_prompt: toStr(c.ai_image_prompt)
  }
}

function sanitizeFaceAnalysis(f: any): any {
  if (!f || typeof f !== 'object') return EMPTY_FACE
  return {
    face_shape: toStr(f.face_shape) || '未提供',
    skin_tone: toStr(f.skin_tone) || '未提供',
    temperament_tags: toStringArray(f.temperament_tags)
  }
}

/** 把模型可能返回的各种乱七八糟形状归一为 {face_analysis, concepts: [...]} */
function normalizeStep1Result(parsed: any): { face_analysis: any; concepts: any[] } {
  parsed = remapKeys(parsed)

  let face_analysis: any = EMPTY_FACE
  let rawConcepts: any[] = []

  // case A: 正确形状
  if (parsed && Array.isArray(parsed.concepts)) {
    face_analysis = parsed.face_analysis ?? EMPTY_FACE
    rawConcepts = parsed.concepts
  }
  // case B: 裸数组（最常见的失败形状）
  else if (Array.isArray(parsed)) {
    log.warn('proxy', 'step1 返回了裸数组，自动包装为 {concepts}', { len: parsed.length })
    rawConcepts = parsed
  }
  // case C: 没有 concepts 但有 face_analysis + 其他单方案字段（即模型只输出了 1 个方案）
  else if (parsed && (parsed.theme_name || parsed.makeup)) {
    log.warn('proxy', 'step1 返回了单方案对象，包装为 concepts 数组', {})
    face_analysis = parsed.face_analysis ?? EMPTY_FACE
    rawConcepts = [parsed]
  } else {
    throw new Error(`返回的 JSON 结构无法识别。期望 {face_analysis, concepts:[...]}，实际收到：${JSON.stringify(parsed).slice(0, 300)}`)
  }

  return {
    face_analysis: sanitizeFaceAnalysis(face_analysis),
    concepts: rawConcepts.map(sanitizeConcept)
  }
}

/** 对单条分镜做字段级 sanitize —— AI 偶尔会漏字段，逐项兜底防止渲染出 undefined */
function sanitizeStoryboard(sb: any, idx: number): any {
  if (!sb || typeof sb !== 'object') sb = {}
  return {
    index: typeof sb.index === 'number' ? sb.index : idx + 1,
    lyric: toStr(sb.lyric),
    shot_size: toStr(sb.shot_size) || '中景',
    angle: toStr(sb.angle) || '平视',
    camera_movement: toStr(sb.camera_movement) || '固定机位',
    perspective: toStr(sb.perspective) || '第三人称视角',
    ref_images: toStringArray(sb.ref_images),
    audio_ref: toStr(sb.audio_ref) || '演唱音频1',
    scene_description: toStr(sb.scene_description)
  }
}

function normalizeStep2Result(parsed: any): any[] {
  parsed = remapKeys(parsed)
  let arr: any[]
  if (Array.isArray(parsed)) arr = parsed
  else if (parsed && Array.isArray(parsed.storyboards)) arr = parsed.storyboards
  else if (parsed && Array.isArray(parsed.shots)) arr = parsed.shots
  else if (parsed && Array.isArray(parsed.list)) arr = parsed.list
  else if (parsed && Array.isArray(parsed.分镜)) arr = parsed.分镜
  else throw new Error('返回不是数组')
  return arr.map(sanitizeStoryboard)
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastErr: any
  for (let i = 0; i <= retries; i++) {
    try { return await fn() } catch (e: any) {
      lastErr = e
      const status = e?.status ?? e?.response?.status
      if (status && status !== 429 && status < 500) throw e
      await new Promise(r => setTimeout(r, 800 * Math.pow(2, i)))
    }
  }
  throw lastErr
}

export function registerClaudeHandlers() {
  ipcMain.handle(IPC.CLAUDE_GENERATE_CONCEPTS, async (event, args: GenerateConceptsArgs) => {
    const s = await getSettings()
    if (s.provider !== 'claude-code-cli' && !s.apiKey) {
      return { ok: false, message: '请先在设置中填写 API Key（或切换到 Claude Code CLI 模式）' }
    }
    log.info('proxy', '开始生成 step1 服化道方案', { provider: s.provider, model: s.defaultModel, lyricsLen: (args.lyrics || '').length, charRefs: args.characterRefIds.length })
    const provider = createProvider(s)

    const images = await loadProjectImages(args.projectPath, 'character', args.characterRefIds)
    log.debug('proxy', '已加载角色参考图', { count: images.length })
    const userParts: ContentPart[] = []
    if (images.length > 0) {
      userParts.push({ type: 'text', text: '【角色参考照（仅用于分析外观气质适配性，禁止输出身份相关描述）】' })
      for (const img of images) {
        userParts.push({ type: 'text', text: `▸ ${img.ref.label}：` })
        userParts.push({ type: 'image', mime: img.mime, base64: img.b64 })
      }
    }
    const elementsLine = args.elements.length ? args.elements.join('、') : '（无）'
    const elementCheck = args.elements.length
      ? `\n\n⚡ 强制要求：每个方案的 ai_image_prompt 中**必须**自然出现以下全部用户指定元素：【${elementsLine}】。不是简单提一句，而是真正描绘到画面里（例如"海边"→"暮色海平面，落日余晖洒在浪花"；"复古相机"→"手持复古胶片相机"；"青春感"→反映在妆容/服装的清新感+少年感氛围词中）。三个方案的元素呈现方式应有差异化。`
      : ''
    userParts.push({
      type: 'text',
      text: `【歌词】\n${args.lyrics || '（未提供）'}\n\n【情调基调】\n${args.mood || '（未提供）'}\n\n【指定元素】\n${elementsLine}${elementCheck}\n\n请基于以上信息输出 3 个差异化的服化道方案。每个 ai_image_prompt 必须是 200-400 字的密集中文关键词堆叠（逗号分隔，不分句），严格遵守 system 中的 10 模块顺序。\n\n⚠️ 最终输出必须是一个 JSON **对象**（不是数组），第一个字符必须是 \`{\`，并严格使用 \`face_analysis\` 和 \`concepts\` 这两个英文键名。`
    })

    const win = BrowserWindow.fromWebContents(event.sender)
    const requestId = (args as any).requestId

    try {
      const fullText = await withRetry(() => provider.chatStream({
        system: STEP1_SYSTEM_PROMPT,
        userParts,
        prefill: '{',
        maxTokens: 6000,
        model: s.defaultModel
      }, (chunk) => {
        if (requestId) {
          win?.webContents.send(IPC.CLAUDE_STREAM_CHUNK, {
            requestId,
            delta: chunk.delta,
            accumulated: chunk.accumulated
          })
        }
      }))
      log.debug('proxy', '已收齐文本', { len: fullText.length, head: fullText.slice(0, 120) })

      let parsed: any
      try {
        parsed = extractJSON(fullText)
      } catch (err: any) {
        log.warn('proxy', '首次解析失败，尝试 reparse', { err: err.message })
        const rtxt = await provider.chat({
          system: '你只能返回纯 JSON，禁止任何解释。第一个字符必须是 { 字符。',
          userParts: [{ type: 'text', text: `上次输出非合法 JSON。请仅返回修正后的 JSON（顶层必须是对象 {face_analysis, concepts:[]}，不是数组），禁止任何额外文字。原文：\n\n${fullText.slice(0, 8000)}` }],
          maxTokens: 6000,
          model: s.defaultModel
        })
        parsed = extractJSON(rtxt)
      }

      const normalized = normalizeStep1Result(parsed)
      normalized.concepts = normalized.concepts.slice(0, 3).map((c: any, i: number) => ({ ...c, id: i + 1 }))
      log.debug('proxy', 'step1 概念已归一化', { concepts: normalized.concepts.map(c => ({ id: c.id, theme: c.theme_name, paletteLen: c.color_palette.length })) })
      log.info('proxy', 'step1 完成', { conceptCount: normalized.concepts.length, faceShape: normalized.face_analysis?.face_shape })

      return { ok: true, data: normalized }
    } catch (e: any) {
      log.error('proxy', 'step1 失败', { err: e?.message ?? String(e) })
      return { ok: false, message: e?.message ?? String(e) }
    }
  })

  ipcMain.handle(IPC.CLAUDE_GENERATE_STORYBOARDS, async (event, args: GenerateStoryboardsArgs) => {
    const s = await getSettings()
    if (s.provider !== 'claude-code-cli' && !s.apiKey) {
      return { ok: false, message: '请先在设置中填写 API Key（或切换到 Claude Code CLI 模式）' }
    }
    log.info('proxy', '开始生成 step2 分镜', { provider: s.provider, model: s.defaultModel, costumeRefs: args.costumeRefs.length })
    const provider = createProvider(s)

    const images = await loadProjectImages(args.projectPath, 'costume', args.costumeRefs.map(r => r.id))
    const userParts: ContentPart[] = []
    if (images.length > 0) {
      userParts.push({ type: 'text', text: '【定妆 / 服装场景参考图（按编号引用）】' })
      for (const img of images) {
        userParts.push({ type: 'text', text: `▸ ${img.ref.label}：` })
        userParts.push({ type: 'image', mime: img.mime, base64: img.b64 })
      }
    }

    const conceptBrief = args.selectedConcept ? `已选定服化道方案（${args.selectedConcept.theme_name} · ${args.selectedConcept.style_direction}）：
- 妆容：${args.selectedConcept.makeup}
- 发型：${args.selectedConcept.hairstyle}
- 服装：${args.selectedConcept.outfit}
- 场景：${args.selectedConcept.scene_atmosphere}
- 色彩：${(args.selectedConcept.color_palette || []).join('、')}
- 整体：${args.selectedConcept.overall_description}` : '（未选定方案）'

    userParts.push({
      type: 'text',
      text: `【歌词】\n${args.lyrics}\n\n【情调基调】\n${args.mood || '（未提供）'}\n\n【指定元素】\n${args.elements.length ? args.elements.join('、') : '（无）'}\n\n${conceptBrief}\n\n可引用的参考图编号：${args.costumeRefs.map(r => r.label).join('、') || '（无）'}\n\n请输出完整的分镜 JSON 数组。严格遵守 system 中的字段约束。第一个字符必须是 \`[\` 字符。`
    })

    const win = BrowserWindow.fromWebContents(event.sender)

    try {
      const fullText = await withRetry(() => provider.chatStream({
        system: STEP2_SYSTEM_PROMPT,
        userParts,
        prefill: '[',
        maxTokens: 8000,
        model: s.defaultModel
      }, (chunk) => {
        win?.webContents.send(IPC.CLAUDE_STREAM_CHUNK, {
          requestId: args.requestId,
          delta: chunk.delta,
          accumulated: chunk.accumulated
        })
      }))
      log.debug('proxy', 'step2 已收齐文本', { len: fullText.length })

      let parsed: any
      try {
        parsed = extractJSON(fullText)
      } catch (err: any) {
        log.warn('proxy', 'step2 首次解析失败，尝试 reparse', { err: err.message })
        const rtxt = await provider.chat({
          system: '你只能返回纯 JSON 数组，禁止任何解释。',
          userParts: [{ type: 'text', text: `上次输出非合法 JSON 数组。请仅返回修正后的 JSON，禁止任何额外文字。原文：\n\n${fullText.slice(0, 12000)}` }],
          maxTokens: 8000,
          model: s.defaultModel
        })
        parsed = extractJSON(rtxt)
      }

      let arr = normalizeStep2Result(parsed)
      arr = arr.map((sb: any, i: number) => ({ ...sb, index: i + 1 }))
      log.debug('proxy', 'step2 已归一化', { sample: arr.slice(0, 2).map(s => ({ idx: s.index, shot: s.shot_size, ang: s.angle, mv: s.camera_movement, persp: s.perspective, scLen: s.scene_description.length })) })
      log.info('proxy', 'step2 完成', { shots: arr.length })

      win?.webContents.send(IPC.CLAUDE_STREAM_DONE, { requestId: args.requestId, data: arr })
      return { ok: true, data: arr }
    } catch (e: any) {
      log.error('proxy', 'step2 失败', { err: e?.message ?? String(e) })
      win?.webContents.send(IPC.CLAUDE_STREAM_ERROR, { requestId: args.requestId, message: e?.message ?? String(e) })
      return { ok: false, message: e?.message ?? String(e) }
    }
  })
}
