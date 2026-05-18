import { useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff, KeyRound, Folder, Check, X, Edit2, Shield, Terminal } from 'lucide-react'
import { PROVIDER_PRESETS, ProviderType } from '../../../shared/schema'

type LoadedSettings = {
  provider: ProviderType
  apiKeySet: boolean
  apiKeyTail: string
  baseUrl: string
  defaultModel: string
  defaultProjectsDir: string
  claudeCodeMode: boolean
  customHeaders: string
  customProtocol: 'anthropic' | 'openai'
  cliPath: string
}

const EMPTY: LoadedSettings = {
  provider: 'claude-code-cli',
  apiKeySet: false,
  apiKeyTail: '',
  baseUrl: '',
  defaultModel: 'claude-opus-4-7',
  defaultProjectsDir: '',
  claudeCodeMode: false,
  customHeaders: '',
  customProtocol: 'openai',
  cliPath: ''
}

export default function Settings() {
  const [loaded, setLoaded] = useState<LoadedSettings>(EMPTY)
  const [presetId, setPresetId] = useState<string>('anthropic-official')
  const [editingKey, setEditingKey] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [testing, setTesting] = useState(false)
  const [test, setTest] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    window.api.settings.get().then((s: any) => {
      const next: LoadedSettings = {
        provider: s.provider || 'claude-code-cli',
        apiKeySet: !!s.apiKeySet,
        apiKeyTail: s.apiKeyTail || '',
        baseUrl: s.baseUrl || '',
        defaultModel: s.defaultModel || 'claude-opus-4-7',
        defaultProjectsDir: s.defaultProjectsDir || '',
        claudeCodeMode: !!s.claudeCodeMode,
        customHeaders: s.customHeaders || '',
        customProtocol: s.customProtocol || 'openai',
        cliPath: s.cliPath || ''
      }
      setLoaded(next)
      // 猜一个 presetId：CLI 优先按 provider 匹配，否则按 baseUrl
      let matchedId = 'claude-code-cli'
      if (next.provider !== 'claude-code-cli') {
        const m = PROVIDER_PRESETS.find(p => p.baseUrl && next.baseUrl === p.baseUrl)
        matchedId = m?.id ?? 'custom'
      }
      setPresetId(matchedId)
      // CLI 模式不需要 key；其他 provider 没 key 时进入编辑模式
      if (next.provider !== 'claude-code-cli' && !next.apiKeySet) setEditingKey(true)
    })
  }, [])

  const currentPreset = useMemo(
    () => PROVIDER_PRESETS.find(p => p.id === presetId) ?? PROVIDER_PRESETS[0],
    [presetId]
  )

  function applyPreset(id: string) {
    setPresetId(id)
    const p = PROVIDER_PRESETS.find(x => x.id === id)
    if (!p) return
    setLoaded(prev => ({
      ...prev,
      provider: p.provider,
      baseUrl: p.baseUrl || prev.baseUrl,
      defaultModel: p.defaultModel || prev.defaultModel,
      claudeCodeMode: p.claudeCodeMode ?? false,
      customProtocol: p.protocol ?? prev.customProtocol
    }))
  }

  async function save() {
    const patch: any = {
      provider: loaded.provider,
      baseUrl: loaded.baseUrl,
      defaultModel: loaded.defaultModel,
      defaultProjectsDir: loaded.defaultProjectsDir,
      claudeCodeMode: loaded.claudeCodeMode,
      customHeaders: loaded.customHeaders,
      customProtocol: loaded.customProtocol,
      cliPath: loaded.cliPath
    }
    if (editingKey && newKey.trim()) {
      patch.apiKey = newKey.trim()
    }
    await window.api.settings.set(patch)
    setSavedAt(Date.now())
    setTimeout(() => setSavedAt(null), 1800)
    // refresh
    const s: any = await window.api.settings.get()
    setLoaded(l => ({
      ...l,
      apiKeySet: !!s.apiKeySet,
      apiKeyTail: s.apiKeyTail || ''
    }))
    setEditingKey(false)
    setNewKey('')
  }

  async function pickDir() {
    const d = await window.api.settings.pickDir()
    if (d) setLoaded(l => ({ ...l, defaultProjectsDir: d }))
  }

  async function doTest() {
    setTesting(true); setTest(null)
    await save()
    const r = await window.api.settings.test()
    setTest(r)
    setTesting(false)
  }

  async function clearKey() {
    if (!confirm('确定清除已保存的 API Key？')) return
    await window.api.settings.set({ clearApiKey: true } as any)
    setLoaded(l => ({ ...l, apiKeySet: false, apiKeyTail: '' }))
    setEditingKey(true)
    setNewKey('')
  }

  const isCli = loaded.provider === 'claude-code-cli'
  const isCustom = loaded.provider === 'custom'
  const isAnthropic = loaded.provider === 'anthropic' || (isCustom && loaded.customProtocol === 'anthropic')

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-1 flex items-center gap-2">
        <KeyRound className="text-accent" size={22} /> 设置
      </h1>
      <p className="text-sm text-ink2 mb-6">
        推荐使用 <span className="text-emerald-300">Claude Code CLI</span>（零配置、复用本地登录态、不走中转）；也支持 Anthropic / OpenAI / Gemini / DeepSeek / 通义千问 / Kimi 等。
      </p>

      <div className="card space-y-5">
        {/* 供应商预设 */}
        <div>
          <label className="label">供应商</label>
          <select
            className="input"
            value={presetId}
            onChange={e => applyPreset(e.target.value)}
          >
            {PROVIDER_PRESETS.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          {currentPreset.note && (
            <div className="text-xs text-amber-300/80 mt-1.5">{currentPreset.note}</div>
          )}
        </div>

        {/* Claude Code CLI 模式：绿色提示 + 可选路径 */}
        {isCli && (
          <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-md p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Terminal size={18} className="text-emerald-300 mt-0.5 shrink-0" />
              <div className="text-sm">
                <div className="font-medium text-emerald-200">使用本地 Claude Code CLI</div>
                <div className="text-xs text-emerald-200/80 mt-1 leading-relaxed">
                  无需 API Key，APP 会以子进程方式调用你已安装并登录的 <code className="bg-black/30 px-1 rounded">claude</code> 命令。
                  按你的 CLI 订阅计费，不走任何第三方中转商。
                </div>
                <div className="text-xs text-emerald-200/60 mt-2">
                  前置条件：① 已安装 Claude Code CLI；② 已通过 <code className="bg-black/30 px-1 rounded">claude</code> 登录账号。
                </div>
              </div>
            </div>
            <div>
              <label className="label text-xs">CLI 路径（可选，留空走 PATH）</label>
              <input
                className="input font-mono text-xs"
                placeholder="留空使用系统 PATH 中的 claude 命令"
                value={loaded.cliPath}
                onChange={e => setLoaded(l => ({ ...l, cliPath: e.target.value }))}
              />
            </div>
          </div>
        )}

        {/* API Key — 状态徽章 / 编辑模式 */}
        {!isCli && (
        <div>
          <label className="label">API Key</label>
          {!editingKey && loaded.apiKeySet ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 input flex items-center justify-between bg-panel2/60">
                <span className="text-sm text-emerald-300 flex items-center gap-2">
                  <Shield size={14} /> 已设置（尾号 {loaded.apiKeyTail}）
                </span>
              </div>
              <button className="btn" onClick={() => { setEditingKey(true); setNewKey('') }}>
                <Edit2 size={14} /> 更换
              </button>
              <button className="btn" onClick={clearKey}>
                <X size={14} /> 清除
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                className="input flex-1 font-mono"
                type={showKey ? 'text' : 'password'}
                placeholder={isAnthropic ? 'sk-ant-...' : 'sk-...'}
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                autoFocus
              />
              <button className="btn" onClick={() => setShowKey(s => !s)}>
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              {loaded.apiKeySet && (
                <button className="btn" onClick={() => { setEditingKey(false); setNewKey('') }}>取消</button>
              )}
            </div>
          )}
        </div>
        )}

        {/* Base URL */}
        {!isCli && (
        <div>
          <label className="label">Base URL</label>
          <input
            className="input"
            value={loaded.baseUrl}
            onChange={e => setLoaded(l => ({ ...l, baseUrl: e.target.value }))}
          />
        </div>
        )}

        {/* 模型 */}
        <div>
          <label className="label">默认模型</label>
          {currentPreset.models.length > 0 ? (
            <select
              className="input"
              value={loaded.defaultModel}
              onChange={e => setLoaded(l => ({ ...l, defaultModel: e.target.value }))}
            >
              {currentPreset.models.map(m => <option key={m} value={m}>{m}</option>)}
              {!currentPreset.models.includes(loaded.defaultModel) && loaded.defaultModel && (
                <option value={loaded.defaultModel}>{loaded.defaultModel}（自定义）</option>
              )}
            </select>
          ) : (
            <input
              className="input"
              placeholder="如 gpt-4o, gemini-2.5-pro, ..."
              value={loaded.defaultModel}
              onChange={e => setLoaded(l => ({ ...l, defaultModel: e.target.value }))}
            />
          )}
        </div>

        {/* Anthropic 专用：Claude Code 兼容模式 */}
        {isAnthropic && (
          <div className="bg-panel2/40 rounded-md p-3 border border-border/50">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={loaded.claudeCodeMode}
                onChange={e => setLoaded(l => ({ ...l, claudeCodeMode: e.target.checked }))}
              />
              <div>
                <div className="text-sm font-medium">Claude Code 兼容模式</div>
                <div className="text-xs text-ink2 mt-0.5">
                  伪装成 Claude Code CLI 发请求（User-Agent + anthropic-beta header）。
                  解决"only allows Claude Code clients"的 503 错误（packycode/anyrouter 等中转）。
                </div>
              </div>
            </label>
          </div>
        )}

        {/* 自定义 provider 专用 */}
        {isCustom && (
          <>
            <div>
              <label className="label">协议风格</label>
              <select
                className="input"
                value={loaded.customProtocol}
                onChange={e => setLoaded(l => ({ ...l, customProtocol: e.target.value as 'openai' | 'anthropic' }))}
              >
                <option value="openai">OpenAI 兼容（/v1/chat/completions）</option>
                <option value="anthropic">Anthropic（/v1/messages）</option>
              </select>
            </div>
            <div>
              <label className="label">额外 Headers（JSON，可选）</label>
              <textarea
                className="input font-mono text-xs"
                rows={3}
                placeholder='{"X-Provider-Key": "value"}'
                value={loaded.customHeaders}
                onChange={e => setLoaded(l => ({ ...l, customHeaders: e.target.value }))}
              />
            </div>
          </>
        )}

        {/* 项目目录 */}
        <div>
          <label className="label">项目默认存储目录</label>
          <div className="flex gap-2">
            <input className="input flex-1" value={loaded.defaultProjectsDir} readOnly placeholder="未设置" />
            <button className="btn" onClick={pickDir}><Folder size={14} /> 选择</button>
          </div>
        </div>

        {/* 操作 */}
        <div className="flex items-center gap-3 pt-2 flex-wrap">
          <button className="btn-primary" onClick={save}>保存</button>
          <button className="btn" onClick={doTest} disabled={testing}>
            {testing ? '测试中…' : '测试连接'}
          </button>
          {savedAt && <span className="text-sm text-emerald-400 flex items-center gap-1"><Check size={14} /> 已保存</span>}
          {test && (
            test.ok
              ? <span className="text-sm text-emerald-400 flex items-center gap-1"><Check size={14} /> {test.message}</span>
              : <span className="text-sm text-red-400 flex items-center gap-1"><X size={14} /> {test.message}</span>
          )}
        </div>
      </div>
    </div>
  )
}
