import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../services/store'
import { Plus, FolderOpen, Folder, Trash2 } from 'lucide-react'

type Recent = { id: string; name: string; path: string; lastOpened: string }

export default function Home() {
  const nav = useNavigate()
  const setProject = useProject(s => s.setProject)
  const reset = useProject(s => s.reset)

  const [recents, setRecents] = useState<Recent[]>([])
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [parentDir, setParentDir] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { reset(); refresh() }, [])

  async function refresh() {
    setRecents(await window.api.project.list())
  }

  async function pickDir() {
    const d = await window.api.settings.pickDir()
    if (d) setParentDir(d)
  }

  async function doCreate() {
    if (!newName.trim() || !parentDir) { setError('请填写项目名并选择存储目录'); return }
    const r = await window.api.project.create({ name: newName.trim(), parentDir })
    if (!r.ok) { setError(r.message || '创建失败'); return }
    setProject(r.projectPath, r.data)
    nav('/step1')
  }

  async function openRecent(r: Recent) {
    try {
      const opened = await window.api.project.open(r.path)
      setProject(opened.projectPath, opened.data)
      // route based on progress
      if ((opened.data?.step1?.concepts?.length ?? 0) > 0) nav('/step2')
      else nav('/step1')
    } catch (e: any) {
      setError(e?.message ?? '打开失败')
    }
  }

  async function openByPicker() {
    const dir = await window.api.project.pickFile()
    if (!dir) return
    const opened = await window.api.project.open(dir)
    setProject(opened.projectPath, opened.data)
    nav('/step1')
  }

  async function removeRecent(r: Recent) {
    await window.api.project.delete(r.path)
    refresh()
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">MV 提示词工坊</h1>
        <p className="text-ink2">
          两步生成：① 服化道方案 → ② 专业分镜表。输出的提示词文本可直接复制到 Midjourney / 即梦 / 可灵 / Veo 使用。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="text-accent" size={18} />
            <h2 className="text-lg font-semibold">新建 MV 项目</h2>
          </div>

          {!creating ? (
            <div className="space-y-3">
              <button className="btn-primary w-full justify-center" onClick={() => setCreating(true)}>
                <Plus size={16} /> 新建项目
              </button>
              <button className="btn w-full justify-center" onClick={openByPicker}>
                <FolderOpen size={16} /> 打开本地项目
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="label">项目名</label>
                <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="例如：漠河舞厅-MV试镜" />
              </div>
              <div>
                <label className="label">存储目录</label>
                <div className="flex gap-2">
                  <input className="input flex-1" value={parentDir} readOnly placeholder="尚未选择" />
                  <button className="btn" onClick={pickDir}><Folder size={14}/> 选择</button>
                </div>
                {parentDir && <div className="text-xs text-ink2 mt-1">将创建：{parentDir}\{newName || '...'}</div>}
              </div>
              {error && <div className="text-sm text-red-400">{error}</div>}
              <div className="flex gap-2">
                <button className="btn-primary flex-1 justify-center" onClick={doCreate}>创建并进入</button>
                <button className="btn" onClick={() => { setCreating(false); setError('') }}>取消</button>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="text-accent" size={18} />
            <h2 className="text-lg font-semibold">最近项目</h2>
          </div>
          {recents.length === 0 ? (
            <div className="text-sm text-ink2 py-8 text-center">暂无最近项目</div>
          ) : (
            <ul className="space-y-1.5 max-h-[420px] overflow-auto">
              {recents.map(r => (
                <li key={r.path} className="flex items-center gap-2 px-3 py-2 rounded hover:bg-panel2 group">
                  <Folder size={14} className="text-ink2 shrink-0" />
                  <button onClick={() => openRecent(r)} className="flex-1 text-left">
                    <div className="text-sm text-ink truncate">{r.name}</div>
                    <div className="text-xs text-ink2 truncate" title={r.path}>{r.path}</div>
                  </button>
                  <button onClick={() => removeRecent(r)} className="opacity-0 group-hover:opacity-100 text-ink2 hover:text-red-400 transition">
                    <Trash2 size={14}/>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
