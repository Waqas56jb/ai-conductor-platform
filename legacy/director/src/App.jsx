import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LanguageProvider } from './context/LanguageContext'
import { DirectorDataProvider } from './context/DirectorDataContext'
import DashboardLayout from './components/DashboardLayout'
import Login from './pages/Login'
import Overview from './pages/Overview'
import Approvals from './pages/Approvals'
import Cases from './pages/Cases'
import Interventions from './pages/Interventions'
import Finance from './pages/Finance'
import Settings from './pages/Settings'

export default function App() {
  return (
    <LanguageProvider>
      <DirectorDataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Overview />} />
              <Route path="approvals" element={<Approvals />} />
              <Route path="cases" element={<Cases />} />
              <Route path="interventions" element={<Interventions />} />
              <Route path="finance" element={<Finance />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </DirectorDataProvider>
    </LanguageProvider>
  )
}
