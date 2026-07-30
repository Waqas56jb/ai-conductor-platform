import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LanguageProvider } from './context/LanguageContext'
import { TechDataProvider } from './context/TechDataContext'
import DashboardLayout from './components/DashboardLayout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Overview from './pages/Overview'
import Tasks from './pages/Tasks'
import TaskDetail from './pages/TaskDetail'
import Notifications from './pages/Notifications'
import Directory from './pages/Directory'
import Profile from './pages/Profile'

export default function App() {
  return (
    <LanguageProvider>
      <TechDataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Overview />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="tasks/:id" element={<TaskDetail />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="directory" element={<Directory />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </TechDataProvider>
    </LanguageProvider>
  )
}
