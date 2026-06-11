import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './stores/authStore'
import BottomNav from './components/layout/BottomNav'
import HomePage from './pages/HomePage/HomePage'
import TeamHallPage from './pages/TeamHallPage/TeamHallPage'
import ChatPage from './pages/ChatPage/ChatPage'
import ProfilePage from './pages/ProfilePage/ProfilePage'
import AdminPage from './pages/AdminPage/AdminPage'
import LoginPage from './pages/LoginPage'

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-16">
      {children}
      <BottomNav />
    </div>
  )
}

export default function App() {
  const { isLoggedIn, fetchMe, user } = useAuthStore()

  useEffect(() => {
    if (isLoggedIn && !user) {
      fetchMe()
    }
    // fetchMe is stable from zustand, omitted from deps intentionally
  }, [isLoggedIn, user])

  if (isLoggedIn && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <img src="/heartsteel-icon.png" alt="" className="w-32 h-auto mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#1f2937', color: '#f3f4f6', border: '1px solid #374151' },
        }}
      />
      <Routes>
        <Route path="/login" element={isLoggedIn ? <Navigate to="/" /> : <LoginPage />} />

        <Route path="/" element={
          isLoggedIn ? <ProtectedLayout><HomePage /></ProtectedLayout> : <Navigate to="/login" />
        } />
        <Route path="/teams" element={
          isLoggedIn ? <ProtectedLayout><TeamHallPage /></ProtectedLayout> : <Navigate to="/login" />
        } />
        <Route path="/chat" element={
          isLoggedIn ? <ProtectedLayout><ChatPage /></ProtectedLayout> : <Navigate to="/login" />
        } />
        <Route path="/chat/:roomId" element={
          isLoggedIn ? <ChatPage /> : <Navigate to="/login" />
        } />
        <Route path="/profile" element={
          isLoggedIn ? <ProtectedLayout><ProfilePage /></ProtectedLayout> : <Navigate to="/login" />
        } />
        <Route path="/profile/:id" element={
          isLoggedIn ? <ProtectedLayout><ProfilePage /></ProtectedLayout> : <Navigate to="/login" />
        } />
        <Route path="/admin" element={
          isLoggedIn ? <ProtectedLayout><AdminPage /></ProtectedLayout> : <Navigate to="/login" />
        } />
      </Routes>
    </>
  )
}
