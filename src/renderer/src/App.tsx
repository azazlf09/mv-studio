import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import DebugDrawer from './components/DebugDrawer'
import Home from './pages/Home'
import Step1Costume from './pages/Step1Costume'
import Step2Storyboard from './pages/Step2Storyboard'
import Settings from './pages/Settings'
import Welcome from './pages/Welcome'

export default function App() {
  // 调试抽屉可见性：跟随 settings.debugMode（默认 false）；Ctrl+` 可临时翻转
  const [showDebug, setShowDebug] = useState(false)
  // settings 加载完成前不渲染主路由，避免 Welcome 闪一下又跳回去
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    window.api.settings.get().then((s: any) => {
      if (cancelled) return
      setShowDebug(!!s.debugMode)
      setSettingsLoaded(true)
    })
    const off = window.api.app.onToggleDebugDrawer(() => setShowDebug(v => !v))
    return () => { cancelled = true; off() }
  }, [])

  if (!settingsLoaded) {
    return <div className="h-screen flex items-center justify-center text-ink2 text-sm">加载中…</div>
  }

  return (
    <ErrorBoundary>
      <OnboardingGuard />
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/step1" element={<Step1Costume />} />
              <Route path="/step2" element={<Step2Storyboard />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        } />
      </Routes>
      {showDebug && <DebugDrawer />}
    </ErrorBoundary>
  )
}

/** 启动时若 onboardingCompleted=false，且当前不在 /welcome，则跳 /welcome */
function OnboardingGuard() {
  const nav = useNavigate()
  const loc = useLocation()
  useEffect(() => {
    window.api.settings.get().then((s: any) => {
      if (!s.onboardingCompleted && loc.pathname !== '/welcome') {
        nav('/welcome', { replace: true })
      }
    })
    // 只在挂载时检查一次；用户点 markOnboardingDone 后即不再进入这里
  }, [])
  return null
}
