import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import Header from './components/Header'
import Footer from './components/Footer'
import Landing from './pages/Landing'
import Tracking from './pages/Tracking'

function App() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 flex-1 w-full">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <Toaster richColors position="top-right" />
    </div>
  )
}

export default App
