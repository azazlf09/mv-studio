import { Component, ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: any) {
    console.error('[ErrorBoundary]', error, info)
  }

  reset = () => {
    this.setState({ error: null })
  }

  reload = () => {
    location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    const e = this.state.error
    return (
      <div className="min-h-screen bg-bg text-ink p-8 flex items-center justify-center">
        <div className="max-w-2xl w-full card border-red-400/40">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={22} />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-red-300">页面渲染出错</h2>
              <p className="text-sm text-ink2 mt-1">
                组件抛出了未捕获的异常。点下方按钮可以尝试恢复，不会丢失项目数据。
              </p>
            </div>
          </div>
          <div className="bg-panel2/60 rounded-md p-3 mb-4">
            <div className="text-xs font-mono text-red-300 break-all">{e.name}: {e.message}</div>
            {e.stack && (
              <details className="mt-2">
                <summary className="text-xs text-ink2 cursor-pointer">堆栈</summary>
                <pre className="text-[10px] text-ink2 mt-1 whitespace-pre-wrap break-all max-h-60 overflow-auto">{e.stack}</pre>
              </details>
            )}
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={this.reset}>
              <RotateCcw size={14} /> 重试
            </button>
            <button className="btn" onClick={this.reload}>刷新页面</button>
          </div>
        </div>
      </div>
    )
  }
}
