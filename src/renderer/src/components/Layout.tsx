import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Sparkles, Clapperboard, Settings as SettingsIcon, Save, HelpCircle } from 'lucide-react'
import { useProject, saveProject } from '../services/store'
import { useEffect, useState } from 'react'
import clsx from 'clsx'

const tabs = [
  { to: '/', label: '首页', icon: Home, exact: true },
  { to: '/step1', label: '① 服化道', icon: Sparkles },
  { to: '/step2', label: '② 分镜', icon: Clapperboard },
  { to: '/settings', label: '设置', icon: SettingsIcon }
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { projectPath, data, dirty } = useProject()
  const loc = useLocation()
  const nav = useNavigate()
  const [saving, setSaving] = useState(false)
  const projectName = data?.meta?.name ?? '未打开项目'
  const isDemo = !!projectName && projectName.includes('示例')

  useEffect(() => {
    const id = setInterval(() => {
      if (dirty) {
        setSaving(true)
        saveProject().finally(() => setSaving(false))
      }
    }, 4000)
    return () => clearInterval(id)
  }, [dirty])

  return (
    <div className="h-screen flex flex-col">
      <header className="h-12 border-b border-border bg-panel flex items-center px-4 gap-4 select-none">
        <div className="font-semibold tracking-wide">
          <span className="text-accent">MV</span> Studio
        </div>
        <nav className="flex items-center gap-1 ml-2">
          {tabs.map(t => {
            const Icon = t.icon
            const active = t.exact ? loc.pathname === t.to : loc.pathname.startsWith(t.to)
            const disabled = (t.to === '/step1' || t.to === '/step2') && !projectPath
            return (
              <button
                key={t.to}
                disabled={disabled}
                onClick={() => !disabled && nav(t.to)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition',
                  active ? 'bg-panel2 text-accent' : 'text-ink2 hover:text-ink hover:bg-panel2',
                  disabled && 'opacity-40 cursor-not-allowed'
                )}
              >
                <Icon size={14} />
                {t.label}
              </button>
            )
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-xs text-ink2">
          <button
            onClick={() => nav('/welcome')}
            className="btn-ghost"
            title="重新查看引导"
          >
            <HelpCircle size={14} /> 帮助
          </button>
          {projectPath && (
            <>
              <span className="px-2 py-1 rounded bg-panel2 text-ink truncate max-w-[280px]" title={projectPath}>
                📁 {projectName}
              </span>
              {dirty ? (
                <span className="text-yellow-300">● 未保存</span>
              ) : saving ? (
                <span className="text-ink2">保存中…</span>
              ) : (
                <span className="text-emerald-400">✓ 已保存</span>
              )}
              <button className="btn-ghost" onClick={() => { setSaving(true); saveProject().finally(() => setSaving(false)) }}>
                <Save size={14} /> 保存
              </button>
            </>
          )}
        </div>
      </header>
      {isDemo && projectPath && (
        <div className="bg-accent/15 border-b border-accent/30 px-4 py-2 text-xs flex items-center justify-between gap-3">
          <span className="text-accent flex items-center gap-2">
            <Sparkles size={12} /> 这是示例项目，可随意修改 · 修改不会影响内置示例
          </span>
          <button
            className="btn-ghost text-xs text-accent"
            onClick={() => nav('/')}
          >
            创建自己的项目 →
          </button>
        </div>
      )}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
