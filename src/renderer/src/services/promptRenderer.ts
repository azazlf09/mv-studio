import type { Storyboard } from '../../../shared/schema'

const f = (v: any, fallback: string) => {
  const s = typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim()
  return s || fallback
}

export function renderStoryboardLine(sb: Storyboard): string {
  const shot = f(sb.shot_size, '中景')
  const ang = f(sb.angle, '平视')
  const mv = f(sb.camera_movement, '固定机位')
  const persp = f(sb.perspective, '第三人称视角')
  const audio = f(sb.audio_ref, '演唱音频1')
  const scene = f(sb.scene_description, '（待补充画面描述）')
  const lyric = f(sb.lyric, '')
  const refs = (sb.ref_images || []).filter(Boolean).join('，')
  return `景别角度:${shot}，${ang}，运镜视角:${mv}，${persp}${refs ? '，' + refs : ''}，${audio}，【${scene}】，歌词:"${lyric}"`
}

export function exportTxt(storyboards: Storyboard[]): string {
  return storyboards.map(renderStoryboardLine).join('\n')
}

export function exportMd(storyboards: Storyboard[]): string {
  const header = '| # | 歌词 | 景别 | 角度 | 运镜 | 视角 | 参考图 | 画面描述 |\n|---|------|------|------|------|------|--------|---------|'
  const rows = storyboards.map(sb =>
    `| ${sb.index} | ${f(sb.lyric, '')} | ${f(sb.shot_size, '中景')} | ${f(sb.angle, '平视')} | ${f(sb.camera_movement, '固定机位')} | ${f(sb.perspective, '第三人称视角')} | ${(sb.ref_images || []).filter(Boolean).join('、')} | ${f(sb.scene_description, '')} |`
  )
  const full = storyboards.map(renderStoryboardLine).join('\n\n')
  return `# 分镜表\n\n${header}\n${rows.join('\n')}\n\n---\n\n## 完整规范文本\n\n${full}\n`
}
