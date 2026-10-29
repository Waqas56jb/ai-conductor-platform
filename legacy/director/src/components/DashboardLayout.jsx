import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { useDirectorData } from '../context/DirectorDataContext'

const links = [
  { to: '/dashboard', end: true, key: 'overview' },
  { to: '/dashboard/approvals', key: 'approvals' },
  { to: '/dashboard/cases', key: 'cases' },
  { to: '/dashboard/interventions', key: 'interventions' },
  { to: '/dashboard/finance', key: 'finance' },
  { to: '/dashboard/settings', key: 'settings' },
]

export default function DashboardLayout() {
  const { t, lang, toggleLang } = useLanguage()
  const { authed, user, logout, kpis } = useDirectorData()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  if (!authed) return <Navigate to="/login" replace />

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
          {links.map((l) => (
            <NavLink
              key={l.key}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `dash-link${isActive ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {t.dash.nav[l.key]}
              {l.key === 'approvals' && kpis.pending ? ` (${kpis.pending})` : ''}
              {l.key === 'finance' && kpis.remindersDue ? ` (${kpis.remindersDue})` : ''}
            </NavLink>
          ))}
        </nav>
        <div className="dash-foot">
          <strong>{user.name}</strong>
          <small style={{ display: 'block', opacity: 0.7 }}>{user.role}</small>
          <button
            type="button"
            className="dash-logout"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            {t.dash.logout}
          </button>
        </div>
      </aside>

      <div>
        <header className="dash-topbar">
          <button type="button" className="dash-menu-btn" onClick={() => setOpen((v) => !v)}>
            <span />
            <span />
            <span />
          </button>
          <div style={{ flex: 1 }}>
            <h1>
              <span className="live-dot" aria-hidden="true" />
              {t.dash.welcome.replace('{name}', user.name.split(' ')[0])}
            </h1>
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
