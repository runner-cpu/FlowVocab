import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AppErrorBoundary from './components/system/AppErrorBoundary'
import './styles/global.css'
import './styles/fonts.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary><App /></AppErrorBoundary>
  </React.StrictMode>
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').then((registration) => {
      // 每次启动主动检查一次 sw.js：浏览器默认最长可隔 24 小时才检查。
      void registration.update().catch(() => undefined)
    }).catch(() => undefined)
  }, { once: true })
}
