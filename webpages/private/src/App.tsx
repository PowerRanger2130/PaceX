import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Pins from './pages/Pins'
import Panel from './pages/Panel'
import Login from './pages/Login'
import { isAuthenticated } from '@/lib/auth'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 flex-1 w-full">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Protected><Pins /></Protected>} />
          <Route path="/panel" element={<Panel />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <Toaster richColors position="top-right" />
    </div>
  )
}

function Protected({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return children
}
