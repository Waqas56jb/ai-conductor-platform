import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { LanguageProvider } from './context/LanguageContext'
import { appLink } from './appUrl'
import Landing from './pages/Landing'
import LegalPage from './pages/LegalPage'
import SectorPage from './pages/SectorPage'
import { attribution, track } from './track'

/** Old bookmarks (/login, /signup, /dashboard…) now live in the app. */
function ToApp({ path }) {
  useEffect(() => {
    window.location.replace(appLink(path))
  }, [path])
  return null
}

/** New page: back to the top (unless aiming at an anchor), and one anonymous visit counted. */
function RouteEffects() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0)
    attribution() // keeps ?utm_… / ?src=qr for the rest of the visit
    track('page_view')
  }, [pathname])
  return null
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <RouteEffects />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/immobilier" element={<SectorPage page="immobilier" />} />
          <Route path="/btp" element={<SectorPage page="btp" />} />
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
