import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LanguageProvider } from './context/LanguageContext'
import { ManagerDataProvider } from './context/ManagerDataContext'
import DashboardLayout from './components/DashboardLayout'
import Login from './pages/Login'
import Overview from './pages/Overview'
import Incidents from './pages/Incidents'
import IncidentDetail from './pages/IncidentDetail'
import Technicians from './pages/Technicians'
import Approvals from './pages/Approvals'
import Calendar from './pages/Calendar'
import Invoices from './pages/Invoices'
import Chats from './pages/Chats'

export default function App() {
  return (
    <LanguageProvider>
      <ManagerDataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Overview />} />
              <Route path="incidents" element={<Incidents />} />
              <Route path="incidents/:id" element={<IncidentDetail />} />
              <Route path="technicians" element={<Technicians />} />
              <Route path="approvals" element={<Approvals />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="chats" element={<Chats />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </ManagerDataProvider>
    </LanguageProvider>
  )
}
