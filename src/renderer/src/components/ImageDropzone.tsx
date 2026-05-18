import { useDropzone } from 'react-dropzone'
import { Upload, X, Image as ImgIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { ImageRef } from '../../../shared/schema'
import clsx from 'clsx'

type Props = {
  projectPath: string
  kind: 'character' | 'costume'
  labelPrefix: string             // e.g. "角色参考图" 或 "人物/服装场景参考图"
  refs: ImageRef[]
  onChange: (refs: ImageRef[]) => void
  hint?: string
}

export default function ImageDropzone({ projectPath, kind, labelPrefix, refs, onChange, hint }: Props) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const missing = refs.filter(r => !thumbs[r.id])
      for (const r of missing) {
        try {
          const dataUrl = await window.api.image.load({ projectPath, kind, filename: r.filename })
          if (cancelled) return
          setThumbs(t => ({ ...t, [r.id]: dataUrl }))
        } catch {}
      }
    })()
    return () => { cancelled = true }
  }, [refs, projectPath, kind])

  const onDrop = useCallback(async (files: File[]) => {
    setBusy(true)
    setError(null)
    try {
      const next: ImageRef[] = [...refs]
      for (const f of files) {
        try {
          const b64 = await fileToBase64(f)
          const idx = next.length + 1
          const label = `${labelPrefix}${idx}`
          const imported = await window.api.image.import({
            projectPath, kind, label, fileBase64: b64, filenameHint: f.name
          })
          next.push(imported)
        } catch (e: any) {
          setError(`「${f.name}」上传失败：${e?.message ?? String(e)}`)
        }
      }
      onChange(next)
    } catch (e: any) {
      setError(`上传失败：${e?.message ?? String(e)}`)
    } finally { setBusy(false) }
  }, [refs, projectPath, kind, labelPrefix, onChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    disabled: busy
  })

  function remove(id: string) {
    onChange(refs.filter(r => r.id !== id).map((r, i) => ({ ...r, label: `${labelPrefix}${i + 1}` })))
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={clsx(
          'rounded-md border-2 border-dashed px-4 py-6 text-center cursor-pointer transition',
          isDragActive ? 'border-accent bg-panel2' : 'border-border hover:border-accent/60',
          busy && 'opacity-60'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="inline-block mb-2 text-ink2" size={20} />
        <div className="text-sm text-ink2">
          {busy ? '处理中…' : isDragActive ? '松开上传' : '拖入图片或点击选择'}
        </div>
        {hint && <div className="text-xs text-ink2/70 mt-1">{hint}</div>}
      </div>

      {error && (
        <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-2 py-1.5">
          {error}
        </div>
      )}

      {refs.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {refs.map(r => (
            <div key={r.id} className="relative group rounded-md overflow-hidden border border-border bg-panel2 aspect-square">
              {thumbs[r.id] ? (
                <img src={thumbs[r.id]} alt={r.label} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-ink2"><ImgIcon size={28} /></div>
              )}
              <div className="absolute bottom-0 inset-x-0 px-1.5 py-1 bg-gradient-to-t from-black/80 to-transparent text-xs text-white truncate">{r.label}</div>
              <button
                onClick={() => remove(r.id)}
                className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function fileToBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(f)
  })
}
