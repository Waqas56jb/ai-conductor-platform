import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LanguageProvider } from './context/LanguageContext'
import { ClientDataProvider } from './context/ClientDataContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import DashboardLayout from './components/dashboard/DashboardLayout'
import Overview from './pages/dashboard/Overview'
import ReportProblem from './pages/dashboard/ReportProblem'
import TrackCases from './pages/dashboard/TrackCases'
import TrackDetail from './pages/dashboard/TrackDetail'
import Quotations from './pages/dashboard/Quotations'
import Invoices from './pages/dashboard/Invoices'
import Support from './pages/dashboard/Support'
import Profile from './pages/dashboard/Profile'

export default function App() {
  return (
    <LanguageProvider>
      <ClientDataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Overview />} />
              <Route path="report" element={<ReportProblem />} />
              <Route path="track" element={<TrackCases />} />
              <Route path="track/:id" element={<TrackDetail />} />
              <Route path="quotations" element={<Quotations />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="support" element={<Support />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ClientDataProvider>
    </LanguageProvider>
  )
}
