import { Provider, ChatParams, StreamHandler } from './types'

export type OpenAIOpts = {
  apiKey: string
  baseURL: string  // e.g. https://api.openai.com/v1
  extraHeaders?: Record<string, string>
}

/**
 * 通用 OpenAI 兼容 provider。同时支持 DeepSeek/Qwen/Kimi/Zhipu/OpenRouter/SiliconFlow 等。
 *
 * 用 fetch 直连，不依赖 openai SDK：体积更小，对各家厂商的协议偏差容忍度更高。
 */
export class OpenAIProvider implements Provider {
  constructor(private opts: OpenAIOpts) {}

  supportsVision() { return true }  // 实际取决于模型，UI 上由 preset 提示

  private url(path: string): string {
    const base = this.opts.baseURL.replace(/\/+$/, '')
    return `${base}/${path.replace(/^\/+/, '')}`
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.opts.apiKey}`,
      ...(this.opts.extraHeaders ?? {})
    }
  }

  private toMessages(p: ChatParams): any[] {
    const userContent: any[] = []
    for (const part of p.userParts) {
      if (part.type === 'text') {
        userContent.push({ type: 'text', text: part.text })
      } else {
        userContent.push({
          type: 'image_url',
          image_url: { url: `data:${part.mime};base64,${part.base64}` }
        })
      }
    }
    const msgs: any[] = [
      { role: 'system', content: p.system },
      { role: 'user', content: userContent }
    ]
    if (p.prefill) msgs.push({ role: 'assistant', content: p.prefill })
    return msgs
  }

  async chat(p: ChatParams): Promise<string> {
    const r = await fetch(this.url('/chat/completions'), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: p.model,
        max_tokens: p.maxTokens,
        messages: this.toMessages(p),
        stream: false
      })
    })
    if (!r.ok) {
      const t = await r.text().catch(() => '')
      throw new Error(`HTTP ${r.status}: ${t.slice(0, 500)}`)
    }
    const data: any = await r.json()
    const text = data?.choices?.[0]?.message?.content ?? ''
    return (p.prefill ?? '') + text
  }

  async chatStream(p: ChatParams, onChunk: StreamHandler): Promise<string> {
    const r = await fetch(this.url('/chat/completions'), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: p.model,
        max_tokens: p.maxTokens,
        messages: this.toMessages(p),
        stream: true
      })
    })
    if (!r.ok) {
      const t = await r.text().catch(() => '')
      throw new Error(`HTTP ${r.status}: ${t.slice(0, 500)}`)
    }
    if (!r.body) throw new Error('响应无 body')

    let acc = ''
    const reader = r.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const ln of lines) {
        const line = ln.trim()
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (payload === '[DONE]') continue
        try {
          const j = JSON.parse(payload)
          const delta = j?.choices?.[0]?.delta?.content ?? ''
          if (delta) {
            acc += delta
            onChunk({ delta, accumulated: (p.prefill ?? '') + acc })
          }
        } catch { /* ignore keepalives */ }
      }
    }
    return (p.prefill ?? '') + acc
  }

  async ping(model: string): Promise<string> {
    const r = await fetch(this.url('/chat/completions'), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model,
        max_tokens: 16,
        messages: [{ role: 'user', content: 'ping' }]
      })
    })
    if (!r.ok) {
      const t = await r.text().catch(() => '')
      throw new Error(`HTTP ${r.status}: ${t.slice(0, 500)}`)
    }
    const data: any = await r.json()
    return data?.choices?.[0]?.message?.content ?? ''
  }
}
