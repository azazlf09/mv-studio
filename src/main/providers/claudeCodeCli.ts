import { spawn, ChildProcess } from 'child_process'
import * as os from 'os'
import { Provider, ChatParams, StreamHandler, ContentPart } from './types'
import { log } from '../util/logger'

/**
 * Claude Code CLI provider — spawns local `claude` CLI with stream-json IO.
 */

export type ClaudeCodeCliOpts = {
  cliPath?: string
}

export class ClaudeCodeCliProvider implements Provider {
  constructor(private opts: ClaudeCodeCliOpts) {}

  supportsVision() { return true }

  private buildArgs(p: ChatParams): string[] {
    return [
      '-p',
      '--input-format', 'stream-json',
      '--output-format', 'stream-json',
      '--verbose',
      '--tools', '',
      '--permission-mode', 'bypassPermissions',
      '--model', p.model,
      '--system-prompt', p.system,
      '--no-session-persistence'
    ]
  }

  private toContentBlocks(parts: ContentPart[]): any[] {
    return parts.map(part => {
      if (part.type === 'text') {
        return { type: 'text', text: part.text }
      }
      return {
        type: 'image',
        source: { type: 'base64', media_type: part.mime, data: part.base64 }
      }
    })
  }

  private run(p: ChatParams, onChunk?: StreamHandler): Promise<string> {
    return new Promise((resolve, reject) => {
      const exe = this.opts.cliPath?.trim() || 'claude'
      const args = this.buildArgs(p)
      const t0 = Date.now()

      const imgCount = p.userParts.filter(x => x.type === 'image').length
      const textChars = p.userParts.filter(x => x.type === 'text').map(x => (x as any).text.length).reduce((a, b) => a + b, 0)

      log.info('cli', '启动 claude CLI', {
        exe,
        model: p.model,
        systemPromptChars: p.system.length,
        userTextChars: textChars,
        userImages: imgCount,
        prefill: p.prefill
      })

      let proc: ChildProcess
      try {
        proc = spawn(exe, args, {
          shell: true,
          cwd: os.tmpdir(),
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true
        })
      } catch (e: any) {
        log.error('cli', '无法启动 CLI', { err: e.message })
        reject(new Error(`无法启动 claude CLI：${e.message || e}`))
        return
      }

      let stdoutBuf = ''
      let stderrBuf = ''
      let accumulated = ''
      let finalResult: string | null = null
      let resultError: string | null = null
      let settled = false
      let textBlockCount = 0
      let stdoutLineCount = 0

      const settle = (fn: () => void) => {
        if (settled) return
        settled = true
        fn()
      }

      proc.on('error', err => {
        log.error('cli', 'spawn error', { msg: err.message })
        settle(() => reject(new Error(`claude CLI 启动失败：${err.message}（请确认已安装 claude 命令）`)))
      })

      proc.stdout!.on('data', (chunk: Buffer) => {
        stdoutBuf += chunk.toString('utf8')
        let nl: number
        while ((nl = stdoutBuf.indexOf('\n')) >= 0) {
          const line = stdoutBuf.slice(0, nl).trim()
          stdoutBuf = stdoutBuf.slice(nl + 1)
          if (!line) continue
          stdoutLineCount++
          let evt: any
          try { evt = JSON.parse(line) } catch {
            log.warn('cli', '非 JSON 输出行', { sample: line.slice(0, 120) })
            continue
          }

          if (evt.type === 'system' && evt.subtype === 'init') {
            log.info('cli', 'CLI 初始化', { sessionId: evt.session_id, model: evt.model, tools: evt.tools?.length ?? 0 })
          } else if (evt.type === 'assistant' && evt.message?.content) {
            for (const block of evt.message.content) {
              if (block.type === 'text' && typeof block.text === 'string') {
                const delta = block.text
                accumulated += delta
                textBlockCount++
                if (onChunk) {
                  onChunk({ delta, accumulated: (p.prefill ?? '') + accumulated })
                }
                if (textBlockCount <= 3 || textBlockCount % 10 === 0) {
                  log.debug('cli', `文本块 #${textBlockCount}`, { len: delta.length, accumLen: accumulated.length, head: delta.slice(0, 80) })
                }
              } else if (block.type === 'thinking') {
                log.debug('cli', 'thinking 块（已忽略）', { len: (block.thinking || '').length })
              }
            }
          } else if (evt.type === 'result') {
            if (evt.is_error) {
              resultError = evt.result || evt.error || '未知 CLI 错误'
              log.error('cli', 'CLI 返回 is_error=true', { error: resultError })
            } else if (typeof evt.result === 'string') {
              finalResult = evt.result
              log.info('cli', '收到 result 事件', { resultLen: finalResult.length, head: finalResult.slice(0, 120) })
            }
          }
        }
      })

      proc.stderr!.on('data', (chunk: Buffer) => {
        const s = chunk.toString('utf8')
        stderrBuf += s
        // Only log non-empty trimmed lines, dedup small noise
        const lines = s.split('\n').map(l => l.trim()).filter(Boolean)
        for (const ln of lines) {
          if (ln.length > 0 && ln.length < 500) log.warn('cli', '[stderr]', ln)
        }
      })

      proc.on('close', code => {
        const dt = ((Date.now() - t0) / 1000).toFixed(1)
        log.info('cli', `CLI 进程退出`, { code, elapsedSec: dt, stdoutLines: stdoutLineCount, textBlocks: textBlockCount, accumChars: accumulated.length, finalResultChars: finalResult?.length ?? 0 })
        if (resultError) {
          settle(() => reject(new Error(`Claude CLI 错误：${resultError}`)))
          return
        }
        if (code !== 0 && finalResult === null) {
          const tail = stderrBuf.trim().split('\n').slice(-5).join('\n')
          settle(() => reject(new Error(
            `claude CLI 退出码 ${code}\n${tail || '(无 stderr 输出)'}\n\n` +
            `请确认：1) 已运行过 \`claude\` 登录账号；2) claude 命令在 PATH 中或已配置 cliPath`
          )))
          return
        }
        const text = finalResult ?? accumulated
        if (!text || !text.trim()) {
          log.warn('cli', 'CLI 返回空文本', { stderrTail: stderrBuf.slice(-300) })
        }
        settle(() => resolve((p.prefill ?? '') + text))
      })

      // 发送 user message
      const userContent = this.toContentBlocks(p.userParts)
      if (p.prefill) {
        userContent.push({
          type: 'text',
          text: `\n\n请直接以 ${JSON.stringify(p.prefill)} 开头输出，不要添加任何解释或代码块标记。`
        })
      }
      const userMsg = { type: 'user', message: { role: 'user', content: userContent } }
      const payload = JSON.stringify(userMsg) + '\n'
      log.debug('cli', '写入 stdin', { bytes: payload.length, blocks: userContent.length })
      proc.stdin!.write(payload)
      proc.stdin!.end()
    })
  }

  async chat(p: ChatParams): Promise<string> {
    return this.run(p)
  }

  async chatStream(p: ChatParams, onChunk: StreamHandler): Promise<string> {
    return this.run(p, onChunk)
  }

  async ping(model: string): Promise<string> {
    return this.run({
      system: 'You are a connectivity check bot. Reply with the single word OK and nothing else.',
      userParts: [{ type: 'text', text: 'ping' }],
      maxTokens: 16,
      model
    })
  }
}
