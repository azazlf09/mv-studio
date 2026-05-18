import { Provider, ChatParams, StreamHandler } from './types'

export type GeminiOpts = {
  apiKey: string
  baseURL: string  // 默认 https://generativelanguage.googleapis.com
}

/**
 * Gemini provider，直连 REST v1beta。
 *
 * 协议：parts 同时支持 text + inline_data（base64）。
 * 流式：用 streamGenerateContent?alt=sse。
 */
export class GeminiProvider implements Provider {
  constructor(private opts: GeminiOpts) {}

  supportsVision() { return true }

  private url(model: string, action: string, sse = false): string {
    const base = this.opts.baseURL.replace(/\/+$/, '')
    const qs = `key=${encodeURIComponent(this.opts.apiKey)}${sse ? '&alt=sse' : ''}`
    return `${base}/v1beta/models/${encodeURIComponent(model)}:${action}?${qs}`
  }

  private toRequestBody(p: ChatParams): any {
    const parts: any[] = []
    for (const part of p.userParts) {
      if (part.type === 'text') {
        parts.push({ text: part.text })
      } else {
        parts.push({ inline_data: { mime_type: part.mime, data: part.base64 } })
      }
    }
    const contents: any[] = [{ role: 'user', parts }]
    if (p.prefill) {
      contents.push({ role: 'model', parts: [{ text: p.prefill }] })
    }
    return {
      systemInstruction: { parts: [{ text: p.system }] },
      contents,
      generationConfig: { maxOutputTokens: p.maxTokens }
    }
  }

  async chat(p: ChatParams): Promise<string> {
    const r = await fetch(this.url(p.model, 'generateContent'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.toRequestBody(p))
    })
    if (!r.ok) {
      const t = await r.text().catch(() => '')
      throw new Error(`HTTP ${r.status}: ${t.slice(0, 500)}`)
    }
    const data: any = await r.json()
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((x: any) => x?.text ?? '')
      .join('') ?? ''
    return (p.prefill ?? '') + text
  }

  async chatStream(p: ChatParams, onChunk: StreamHandler): Promise<string> {
    const r = await fetch(this.url(p.model, 'streamGenerateContent', true), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.toRequestBody(p))
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
        if (!payload) continue
        try {
          const j = JSON.parse(payload)
          const delta = j?.candidates?.[0]?.content?.parts
            ?.map((x: any) => x?.text ?? '')
            .join('') ?? ''
          if (delta) {
            acc += delta
            onChunk({ delta, accumulated: (p.prefill ?? '') + acc })
          }
        } catch { /* ignore */ }
      }
    }
    return (p.prefill ?? '') + acc
  }

  async ping(model: string): Promise<string> {
    const r = await fetch(this.url(model, 'generateContent'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
        generationConfig: { maxOutputTokens: 16 }
      })
    })
    if (!r.ok) {
      const t = await r.text().catch(() => '')
      throw new Error(`HTTP ${r.status}: ${t.slice(0, 500)}`)
    }
    const data: any = await r.json()
    return data?.candidates?.[0]?.content?.parts?.map((x: any) => x?.text ?? '').join('') ?? ''
  }
}
