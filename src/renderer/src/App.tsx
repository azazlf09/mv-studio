import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import DebugDrawer from './components/DebugDrawer'
import Home from './pages/Home'
import Step1Costume from './pages/Step1Costume'
import Step2Storyboard from './pages/Step2Storyboard'
import Settings from './pages/Settings'

export default function App() {
  return (
    <ErrorBoundary>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/step1" element={<Step1Costume />} />
          <Route path="/step2" element={<Step2Storyboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <DebugDrawer />
    </ErrorBoundary>
  )
}
