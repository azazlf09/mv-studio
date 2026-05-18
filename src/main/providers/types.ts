/**
 * 统一的 LLM provider 接口。屏蔽 Anthropic/OpenAI/Gemini 协议差异。
 *
 * 输入：system + 一系列 text/image content blocks。
 * 输出：纯文本（或流式 chunk）。JSON 解析由调用方负责。
 */

export type ImagePart = {
  type: 'image'
  mime: string
  base64: string
}

export type TextPart = {
  type: 'text'
  text: string
}

export type ContentPart = TextPart | ImagePart

export type ChatParams = {
  system: string
  userParts: ContentPart[]
  /** Anthropic-only：prefill assistant message (e.g. "{" or "[" to force JSON) */
  prefill?: string
  maxTokens: number
  model: string
}

export type StreamHandler = (chunk: { delta: string; accumulated: string }) => void

export interface Provider {
  /** 非流式：返回完整文本（已附 prefill 前缀） */
  chat(params: ChatParams): Promise<string>
  /** 流式：通过回调推送 delta，最后返回完整文本（已附 prefill 前缀） */
  chatStream(params: ChatParams, onChunk: StreamHandler): Promise<string>
  /** 测试连通性，返回简短回复 */
  ping(model: string): Promise<string>
  /** 是否支持图像输入。 */
  supportsVision(): boolean
}
