import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import useAuthStore from './store/authStore'
import DashboardPage from './pages/DashboardPage'
import WorkspacePage from './pages/WorkspacePage'
import AdminPage from './pages/AdminPage'
import SplitMergePage from './pages/SplitMergePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuthStore()
  if (loading) return null // Or a spinner
  if (!user) return <Navigate to="/login" replace />
  return children
}

const AppRoutes = () => {
  const { init } = useAuthStore()
  
  useEffect(() => {
    init()
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/workspace/:blobId" element={<ProtectedRoute><WorkspacePage /></ProtectedRoute>} />
      <Route path="/workspace/:blobId/split" element={<ProtectedRoute><SplitMergePage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return <AppRoutes />
}
