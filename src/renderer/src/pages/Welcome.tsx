import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, FolderPlus, FolderOpen, Terminal, Check, X, ExternalLink, ChevronRight, KeyRound } from 'lucide-react'
import { useProject } from '../services/store'

type CliStatus = { found: boolean; version?: string; path?: string; error?: string } | null

const CC_INSTALL_URL = 'https://docs.claude.com/en/docs/agents-and-tools/claude-code/overview'
const CC_INSTALL_CMD = 'npm install -g @anthropic-ai/claude-code'

export default function Welcome() {
  const nav = useNavigate()
  const setProject = useProject(s => s.setProject)

  const [cli, setCli] = useState<CliStatus>(null)
  const [apiKeySet, setApiKeySet] = useState(false)
  const [creating, setCreating] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [cmdCopied, setCmdCopied] = useState(false)

  useEffect(() => {
    window.api.app.detectCli().then(setCli).catch(() => setCli({ found: false, error: '检测失败' }))
    window.api.settings.get().then((s: any) => setApiKeySet(!!s.apiKeySet))
  }, [])

  async function markDoneAndNav(to: string) {
    await window.api.settings.set({ onboardingCompleted: true } as any)
    nav(to)
  }

  async function tryDemo() {
    setCreating(true)
    setErrorMsg('')
    try {
      const settings: any = await window.api.settings.get()
      const r = await window.api.app.createDemoProject(settings.defaultProjectsDir || undefined)
      if (!r.ok || !r.projectPath) {
        setErrorMsg(r.message || '创建示例项目失败')
        setCreating(false)
        return
      }
      setProject(r.projectPath, r.data)
      await window.api.settings.set({ onboardingCompleted: true } as any)
      nav('/step2')
    } catch (e: any) {
      setErrorMsg(e?.message ?? String(e))
      setCreating(false)
    }
  }

  async function openCliDocs() {
    await window.api.app.openExternal(CC_INSTALL_URL)
  }

  async function copyInstallCmd() {
    try {
      await navigator.clipboard.writeText(CC_INSTALL_CMD)
      setCmdCopied(true)
      setTimeout(() => setCmdCopied(false), 1800)
    } catch {}
  }

  return (
    <div className="min-h-screen overflow-auto">
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <Sparkles size={28} className="text-accent" />
            <span className="text-2xl font-bold tracking-wide">MV Studio</span>
          </div>
          <h1 className="text-3xl font-bold mb-3">两步生成 MV 提示词</h1>
          <p className="text-ink2 text-base max-w-2xl mx-auto leading-relaxed">
            服化道定妆 + 专业分镜，输出的提示词可直接复制到
            <span className="text-ink mx-1">Midjourney / 即梦 / 可灵 / Veo</span>
            生成图像与视频
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          <DependencyCard
            icon={<Terminal size={18} />}
            title="Claude Code CLI"
            optional={false}
            status={cli === null ? 'checking' : cli.found ? 'ok' : 'missing'}
            okText={cli?.version ? `已检测到 v${cli.version}` : '已检测到'}
            missingText="未检测到，调用 AI 生成会失败"
            extra={
              cli && !cli.found && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs text-ink2">在 PowerShell 里跑这一行：</div>
                  <div className="flex items-stretch gap-2">
                    <code className="flex-1 bg-bg/60 border border-border rounded px-2 py-1.5 text-xs font-mono break-all">
                      {CC_INSTALL_CMD}
                    </code>
                    <button className="btn text-xs px-2" onClick={copyInstallCmd}>
                      {cmdCopied ? <Check size={12} /> : '复制'}
                    </button>
                  </div>
                  <button className="btn-ghost text-xs text-accent" onClick={openCliDocs}>
                    <ExternalLink size={12} /> 查看官方安装指引
                  </button>
                </div>
              )
            }
          />

          <DependencyCard
            icon={<KeyRound size={18} />}
            title="API Key（可选）"
            optional={true}
            status={apiKeySet ? 'ok' : 'optional-empty'}
            okText="已配置 API Key"
            missingText="未配置 · 走 CLI 不需要"
            extra={
              !apiKeySet && (
                <div className="mt-3">
                  <button
                    className="btn-ghost text-xs text-accent"
                    onClick={() => markDoneAndNav('/settings')}
                  >
                    <ChevronRight size={12} /> 去配置 API（如 DeepSeek / 通义 / OpenAI / Gemini）
                  </button>
                </div>
              )
            }
          />
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={tryDemo}
            disabled={creating}
            className="w-full text-left p-5 rounded-lg border-2 border-accent/40 bg-accent/5 hover:bg-accent/10 hover:border-accent/70 transition disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center text-accent shrink-0">
                <Sparkles size={22} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-semibold text-ink">试用示例项目</h3>
                  <span className="text-[10px] bg-accent text-bg px-1.5 py-0.5 rounded font-medium">推荐</span>
                </div>
                <p className="text-sm text-ink2">
                  {creating
                    ? '正在创建示例项目…'
                    : '一首虚构原创歌词《夜色信号》· 已预填 3 个定妆方案 + 12 条分镜，30 秒看完整效果 · 无需 CLI'}
                </p>
              </div>
              <ChevronRight size={18} className="text-ink2 group-hover:text-accent transition" />
            </div>
          </button>

          <button
            onClick={() => markDoneAndNav('/')}
            className="w-full text-left p-5 rounded-lg border border-border bg-panel hover:bg-panel2 hover:border-accent/40 transition group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-panel2 flex items-center justify-center text-ink2 shrink-0">
                <FolderPlus size={22} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-ink mb-1">新建我的 MV 项目</h3>
                <p className="text-sm text-ink2">从空白开始 · 填歌词 + 上传角色照 → AI 生成定妆 + 分镜</p>
              </div>
              <ChevronRight size={18} className="text-ink2 group-hover:text-accent transition" />
            </div>
          </button>

          <button
            onClick={() => markDoneAndNav('/')}
            className="w-full text-left p-5 rounded-lg border border-border bg-panel hover:bg-panel2 hover:border-accent/40 transition group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-panel2 flex items-center justify-center text-ink2 shrink-0">
                <FolderOpen size={22} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-ink mb-1">打开本地项目</h3>
                <p className="text-sm text-ink2">从硬盘选择已有项目目录 · 继续之前的创作</p>
              </div>
              <ChevronRight size={18} className="text-ink2 group-hover:text-accent transition" />
            </div>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
            {errorMsg}
          </div>
        )}

        <div className="text-center">
          <button
            onClick={() => markDoneAndNav('/')}
            className="text-xs text-ink2 hover:text-ink transition underline-offset-4 hover:underline"
          >
            跳过引导（下次启动不再显示）
          </button>
        </div>
      </div>
    </div>
  )
}

function DependencyCard(props: {
  icon: React.ReactNode
  title: string
  optional: boolean
  status: 'checking' | 'ok' | 'missing' | 'optional-empty'
  okText: string
  missingText: string
  extra?: React.ReactNode
}) {
  const { icon, title, optional, status, okText, missingText, extra } = props
  const isOk = status === 'ok'
  const isChecking = status === 'checking'
  const isMissing = status === 'missing'

  return (
    <div className={
      'p-4 rounded-lg border ' +
      (isOk ? 'border-emerald-500/30 bg-emerald-500/5' :
       isMissing ? 'border-red-500/30 bg-red-500/5' :
       'border-border bg-panel')
    }>
      <div className="flex items-start gap-3">
        <div className={
          'w-8 h-8 rounded shrink-0 flex items-center justify-center ' +
          (isOk ? 'bg-emerald-500/20 text-emerald-300' :
           isMissing ? 'bg-red-500/20 text-red-300' :
           'bg-panel2 text-ink2')
        }>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink">{title}</span>
            {optional && <span className="text-[10px] px-1.5 py-0.5 rounded bg-panel2 text-ink2">可选</span>}
          </div>
          <div className={
            'text-xs mt-1 flex items-center gap-1 ' +
            (isOk ? 'text-emerald-300' :
             isMissing ? 'text-red-300' :
             'text-ink2')
          }>
            {isChecking ? (
              <>检测中…</>
            ) : isOk ? (
              <><Check size={12} /> {okText}</>
            ) : isMissing ? (
              <><X size={12} /> {missingText}</>
            ) : (
              <>{missingText}</>
            )}
          </div>
          {extra}
        </div>
      </div>
    </div>
  )
}
