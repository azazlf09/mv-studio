import { Provider } from './types'
import { AnthropicProvider } from './anthropic'
import { OpenAIProvider } from './openai'
import { GeminiProvider } from './gemini'
import { ClaudeCodeCliProvider } from './claudeCodeCli'
import { AppSettings } from '../../shared/schema'

export * from './types'

function parseHeaders(raw: string): Record<string, string> | undefined {
  if (!raw?.trim()) return undefined
  try {
    const j = JSON.parse(raw)
    if (j && typeof j === 'object') return j as Record<string, string>
  } catch { /* fallthrough */ }
  return undefined
}

/** 根据 AppSettings 实例化对应 provider。 */
export function createProvider(s: AppSettings): Provider {
  const extraHeaders = parseHeaders(s.customHeaders)

  if (s.provider === 'claude-code-cli') {
    return new ClaudeCodeCliProvider({ cliPath: s.cliPath })
  }

  if (s.provider === 'anthropic') {
    return new AnthropicProvider({
      apiKey: s.apiKey,
      baseURL: s.baseUrl || undefined,
      claudeCodeMode: s.claudeCodeMode,
      extraHeaders
    })
  }

  if (s.provider === 'openai') {
    return new OpenAIProvider({
      apiKey: s.apiKey,
      baseURL: s.baseUrl,
      extraHeaders
    })
  }

  if (s.provider === 'gemini') {
    return new GeminiProvider({
      apiKey: s.apiKey,
      baseURL: s.baseUrl || 'https://generativelanguage.googleapis.com'
    })
  }

  // custom：按 customProtocol 决定走哪个协议
  if (s.customProtocol === 'anthropic') {
    return new AnthropicProvider({
      apiKey: s.apiKey,
      baseURL: s.baseUrl,
      claudeCodeMode: s.claudeCodeMode,
      extraHeaders
    })
  }
  return new OpenAIProvider({
    apiKey: s.apiKey,
    baseURL: s.baseUrl,
    extraHeaders
  })
}
