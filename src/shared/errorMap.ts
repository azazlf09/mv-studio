/**
 * 把后端/网络/CLI 各种原始错误翻译成「人话三件套」：
 *   title  —— 一行说"发生了什么"
 *   hint   —— 一行说"用户现在该做什么"
 *   action —— （可选）操作按钮的标签 + 跳转的路由
 *
 * 原始消息按出现频率最高的特征字符串匹配。匹配不到 → 给一个通用「未知错误」兜底。
 */

export type FriendlyErrorInfo = {
  title: string
  hint: string
  action?: { label: string; route?: string; external?: string }
}

type Rule = {
  test: (s: string) => boolean
  build: (s: string) => FriendlyErrorInfo
}

const RULES: Rule[] = [
  // ── Claude Code CLI 缺失 ──────────────────────────────────────
  {
    test: s => /claude.*(not found|不是内部或外部命令|is not recognized|ENOENT)/i.test(s)
            || /Cannot find module.*claude/i.test(s)
            || /spawn claude ENOENT/i.test(s),
    build: () => ({
      title: '未检测到 Claude Code CLI',
      hint: '请先在 PowerShell 中执行 `npm install -g @anthropic-ai/claude-code` 并完成 `claude login` 登录，然后重新点击生成。',
      action: { label: '查看官方安装指引', external: 'https://docs.claude.com/en/docs/agents-and-tools/claude-code/overview' }
    })
  },

  // ── 中转商 5xx（PackyCode / AnyRouter 等）──────────────────────
  {
    test: s => /\b50[0-9]\b/.test(s) && /upstream/i.test(s),
    build: () => ({
      title: '服务商上游暂时不可用',
      hint: '这是中转商上游（不是你的 key）问题。建议：① 稍等 1-2 分钟重试；② 在设置里换一个供应商。',
      action: { label: '去切换供应商', route: '/settings' }
    })
  },
  {
    test: s => /\b502\b/.test(s) || /Bad Gateway/i.test(s),
    build: () => ({
      title: '服务商网关错误 (502)',
      hint: '中转商上游网关挂了。换个供应商或稍等几分钟再试。',
      action: { label: '去切换供应商', route: '/settings' }
    })
  },
  {
    test: s => /\b503\b/.test(s),
    build: s => {
      if (/only allows Claude Code/i.test(s)) {
        return {
          title: '此中转商只接受 Claude Code 客户端',
          hint: '请去设置勾选「Claude Code 兼容模式」，或选用 PackyCode / AnyRouter 预设（自动开启兼容模式）。',
          action: { label: '去设置', route: '/settings' }
        }
      }
      return {
        title: '服务暂时不可用 (503)',
        hint: '中转商压力过大或上游限流。换个供应商或稍后再试。',
        action: { label: '去切换供应商', route: '/settings' }
      }
    }
  },
  {
    test: s => /\b504\b/.test(s) || /timeout/i.test(s),
    build: () => ({
      title: '请求超时',
      hint: '生成提示词需要 30-90 秒，如果一直超时说明网络或中转商有问题。换个供应商试试。',
      action: { label: '去切换供应商', route: '/settings' }
    })
  },

  // ── 鉴权类 ────────────────────────────────────────────────────
  {
    test: s => /\b401\b/.test(s) || /invalid.*api.*key/i.test(s) || /authentication/i.test(s),
    build: () => ({
      title: 'API Key 无效或已过期',
      hint: '请去设置确认 API Key 拼写正确；或重新去服务商后台生成新 key 后填入。',
      action: { label: '去设置 API Key', route: '/settings' }
    })
  },
  {
    test: s => /\b403\b/.test(s) || /forbidden/i.test(s) || /access denied/i.test(s),
    build: () => ({
      title: '权限被拒',
      hint: '你的 API Key 没有访问该模型的权限。检查供应商额度，或换个模型 / 供应商。',
      action: { label: '去设置', route: '/settings' }
    })
  },
  {
    test: s => /\b429\b/.test(s) || /rate limit/i.test(s) || /quota/i.test(s),
    build: () => ({
      title: '请求过于频繁 / 配额耗尽',
      hint: '稍等几分钟后再试；如果是额度问题请去供应商后台充值或换个供应商。',
      action: { label: '去切换供应商', route: '/settings' }
    })
  },

  // ── 网络/连接 ─────────────────────────────────────────────────
  {
    test: s => /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|network.*error|fetch failed/i.test(s),
    build: () => ({
      title: '网络连接失败',
      hint: '检查代理 / VPN 是否正常；如果你的网络访问境外 API 有困难，可以选用国产供应商（DeepSeek / 通义 / 智谱）。',
      action: { label: '去切换供应商', route: '/settings' }
    })
  },

  // ── 解析 / 形状 ───────────────────────────────────────────────
  {
    test: s => /JSON.*parse|Unexpected token|Unexpected end of JSON/i.test(s),
    build: () => ({
      title: 'AI 返回的内容无法解析',
      hint: '模型本次输出格式有问题。直接重新点一次生成通常会成功；如果连续失败请去调试面板查看原始输出。',
    })
  },

  // ── 生成被中断 / 空输出 ──────────────────────────────────────
  {
    test: s => /empty|no content|没有内容|空回复/i.test(s),
    build: () => ({
      title: 'AI 没有返回任何内容',
      hint: '可能是 CLI 调用被中断或网络抖动。重新点一次生成即可。',
    })
  }
]

export function classifyError(rawError: unknown): FriendlyErrorInfo {
  const s = String((rawError as any)?.message ?? rawError ?? '').slice(0, 2000)
  for (const r of RULES) {
    try {
      if (r.test(s)) return r.build(s)
    } catch {}
  }
  return {
    title: '生成失败',
    hint: '展开下方「技术详情」查看原始错误。也可以试试重新点一次生成。',
  }
}
