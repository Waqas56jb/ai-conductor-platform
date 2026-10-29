import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LanguageProvider } from './context/LanguageContext'
import { appLink } from './appUrl'
import Landing from './pages/Landing'
import LegalPage from './pages/LegalPage'

/** Old bookmarks (/login, /signup, /dashboard…) now live in the app. */
function ToApp({ path }) {
  useEffect(() => {
    window.location.replace(appLink(path))
  }, [path])
  return null
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/mentions-legales" element={<LegalPage page="mentions" />} />
          <Route path="/cgu" element={<LegalPage page="cgu" />} />
          <Route path="/confidentialite" element={<LegalPage page="privacy" />} />
          <Route path="/login" element={<ToApp path="/login" />} />
          <Route path="/signup" element={<ToApp path="/signup" />} />
          <Route path="/dashboard/*" element={<ToApp path="/app" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  )
}
