import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { useClientData } from '../../context/ClientDataContext'
import './dashboard.css'

const links = [
  { to: '/dashboard', end: true, key: 'overview', icon: '▣' },
  { to: '/dashboard/report', key: 'report', icon: '◎' },
  { to: '/dashboard/track', key: 'track', icon: '◌' },
  { to: '/dashboard/quotations', key: 'quotations', icon: '€' },
  { to: '/dashboard/invoices', key: 'invoices', icon: '▤' },
  { to: '/dashboard/support', key: 'support', icon: '✉' },
  { to: '/dashboard/profile', key: 'profile', icon: '☺' },
]

export default function DashboardLayout() {
  const { t, lang, toggleLang } = useLanguage()
  const { user } = useClientData()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  function logout() {
    navigate('/login')
  }

  return (
    <div className={`dash${open ? ' sidebar-open' : ''}`}>
      <div className="dash-overlay" onClick={() => setOpen(false)} aria-hidden="true" />

      <aside className="dash-sidebar">
        <div className="dash-brand">
          <span className="dash-brand-mark">P</span>
          <div>
            <strong>{t.brand}</strong>
            <small>{t.dash.portal}</small>
          </div>
        </div>

        <nav className="dash-nav" aria-label="Dashboard">
          {links.map((link) => (
            <NavLink
              key={link.key}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `dash-link${isActive ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="dash-link-icon" aria-hidden="true">
                {link.icon}
              </span>
              {t.dash.nav[link.key]}
            </NavLink>
          ))}
        </nav>

        <div className="dash-sidebar-foot">
          <div className="dash-user-chip">
            <div className="dash-avatar">{user.name.slice(0, 1)}</div>
            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
          </div>
          <button type="button" className="dash-logout" onClick={logout}>
            {t.dash.logout}
          </button>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-topbar">
          <button
            type="button"
            className="dash-menu-btn"
            aria-label="Open menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className="dash-topbar-title">
            <h1>{t.dash.welcome.replace('{name}', user.name.split(' ')[0])}</h1>
            <p>{t.dash.subtitle}</p>
          </div>
          <div className="dash-topbar-actions">
            <button type="button" className="lang-toggle" onClick={toggleLang}>
              <span className={lang === 'en' ? 'active' : ''}>EN</span>
              {' / '}
              <span className={lang === 'fr' ? 'active' : ''}>FR</span>
            </button>
          </div>
        </header>

        <div className="dash-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
