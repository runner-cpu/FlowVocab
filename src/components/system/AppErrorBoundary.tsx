import { Component, type ErrorInfo, type ReactNode } from 'react'

export default class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(_error: Error, _info: ErrorInfo) {}
  render() {
    if (this.state.failed) return <main className="loading" role="alert" aria-live="assertive" aria-labelledby="app-error-title"><p id="app-error-title">页面加载遇到问题</p><button className="btn btn-primary" onClick={() => window.location.reload()}>重新加载</button></main>
    return this.props.children
  }
}
