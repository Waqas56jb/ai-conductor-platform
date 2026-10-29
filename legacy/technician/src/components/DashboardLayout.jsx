import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { useTechData } from '../context/TechDataContext'

const links = [
  { to: '/dashboard', end: true, key: 'overview' },
  { to: '/dashboard/tasks', key: 'tasks' },
  { to: '/dashboard/notifications', key: 'notifications' },
  { to: '/dashboard/directory', key: 'directory' },
  { to: '/dashboard/profile', key: 'profile' },
]

export default function DashboardLayout() {
  const { t, lang, toggleLang } = useLanguage()
  const { authed, profile, logout, kpis } = useTechData()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  if (!authed) return <Navigate to="/login" replace />

  function onLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className={`dash${open ? ' sidebar-open' : ''}`}>
      <div className="dash-overlay" onClick={() => setOpen(false)} />
      <aside className="dash-sidebar">
        <div className="dash-brand">
          <span className="dash-brand-mark">P</span>
          <div>
            <strong>{t.brand}</strong>
            <small>{t.portal}</small>
          </div>
        </div>
        <nav className="dash-nav">
          {links.map((link) => (
            <NavLink
              key={link.key}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `dash-link${isActive ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {t.dash.nav[link.key]}
              {link.key === 'notifications' && kpis.unread ? ` (${kpis.unread})` : ''}
            </NavLink>
          ))}
        </nav>
        <div className="dash-foot">
          <div className="dash-user">
            <img src={profile.photo} alt="" />
            <div>
              <strong>{profile.name}</strong>
              <small>{profile.specialty}</small>
            </div>
          </div>
          <button type="button" className="dash-logout" onClick={onLogout}>
            {t.dash.logout}
          </button>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-topbar">
          <button type="button" className="dash-menu-btn" onClick={() => setOpen((v) => !v)}>
            <span />
            <span />
            <span />
          </button>
          <div style={{ flex: 1 }}>
            <h1>{t.dash.welcome.replace('{name}', profile.name.split(' ')[0])}</h1>
            <p>{t.dash.subtitle}</p>
          </div>
          <button type="button" className="lang-toggle" onClick={toggleLang}>
            <span className={lang === 'en' ? 'active' : ''}>EN</span>
            {' / '}
            <span className={lang === 'fr' ? 'active' : ''}>FR</span>
          </button>
        </header>
        <div className="dash-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
