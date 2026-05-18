import Anthropic from '@anthropic-ai/sdk'
import { Provider, ChatParams, StreamHandler } from './types'

export type AnthropicOpts = {
  apiKey: string
  baseURL?: string
  /** 伪装成 Claude Code CLI：解决"only allows Claude Code clients"的中转 */
  claudeCodeMode?: boolean
  /** 额外 headers（如自定义 provider 用 Anthropic 协议时） */
  extraHeaders?: Record<string, string>
}

/** Claude Code CLI 实际发送的 UA / beta header（用于伪装） */
const CC_UA = 'claude-cli/1.0.45 (external, cli)'
const CC_BETA = 'claude-code-20250219'

function buildHeaders(opts: AnthropicOpts): Record<string, string> {
  const h: Record<string, string> = {}
  if (opts.claudeCodeMode) {
    h['User-Agent'] = CC_UA
    h['anthropic-beta'] = CC_BETA
    h['x-app'] = 'cli'
  }
  if (opts.extraHeaders) Object.assign(h, opts.extraHeaders)
  return h
}

export class AnthropicProvider implements Provider {
  private client: Anthropic
  constructor(private opts: AnthropicOpts) {
    this.client = new Anthropic({
      apiKey: opts.apiKey,
      baseURL: opts.baseURL,
      defaultHeaders: buildHeaders(opts)
    })
  }

  supportsVision() { return true }

  private toMessages(p: ChatParams): { system: any; messages: any[] } {
    const blocks: any[] = []
    for (const part of p.userParts) {
      if (part.type === 'text') {
        blocks.push({ type: 'text', text: part.text })
      } else {
        blocks.push({
          type: 'image',
          source: { type: 'base64', media_type: part.mime, data: part.base64 }
        })
      }
    }
    const messages: any[] = [{ role: 'user', content: blocks }]
    if (p.prefill) messages.push({ role: 'assistant', content: p.prefill })
    return {
      system: [{ type: 'text', text: p.system, cache_control: { type: 'ephemeral' } }],
      messages
    }
  }

  async chat(p: ChatParams): Promise<string> {
    const { system, messages } = this.toMessages(p)
    const res = await this.client.messages.create({
      model: p.model,
      max_tokens: p.maxTokens,
      system,
      messages
    } as any)
    const text = res.content?.[0]?.type === 'text' ? res.content[0].text : ''
    return (p.prefill ?? '') + text
  }

  async chatStream(p: ChatParams, onChunk: StreamHandler): Promise<string> {
    const { system, messages } = this.toMessages(p)
    const stream = await this.client.messages.stream({
      model: p.model,
      max_tokens: p.maxTokens,
      system,
      messages
    } as any)
    let acc = ''
    for await (const ev of stream as any) {
      if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
        acc += ev.delta.text
        onChunk({ delta: ev.delta.text, accumulated: (p.prefill ?? '') + acc })
      }
    }
    await stream.finalMessage()
    return (p.prefill ?? '') + acc
  }

  async ping(model: string): Promise<string> {
    const res = await this.client.messages.create({
      model,
      max_tokens: 16,
      messages: [{ role: 'user', content: 'ping' }]
    } as any)
    return res.content?.[0]?.type === 'text' ? res.content[0].text : ''
  }
}
