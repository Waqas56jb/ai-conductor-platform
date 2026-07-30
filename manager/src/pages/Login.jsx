import { Navigate, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { useManagerData } from '../context/ManagerDataContext'

const IMG =
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80'

export default function Login() {
  const { t, lang, toggleLang } = useLanguage()
  const { login, authed } = useManagerData()
  const navigate = useNavigate()
  const [email, setEmail] = useState('lea.bernard@pratonna.fr')
  const [password, setPassword] = useState('password')

  if (authed) return <Navigate to="/dashboard" replace />

  function onSubmit(e) {
    e.preventDefault()
    login()
    navigate('/dashboard')
  }

  return (
    <div className="auth-page">
      <aside className="auth-visual">
        <img src={IMG} alt="" />
        <div className="auth-visual-overlay">
          <h1>{t.brand}</h1>
          <p>{t.portal}</p>
        </div>
      </aside>
      <main className="auth-panel">
        <div className="auth-card">
          <div className="auth-top">
            <button type="button" className="lang-toggle" onClick={toggleLang}>
              <span className={lang === 'en' ? 'active' : ''}>EN</span>
              {' / '}
              <span className={lang === 'fr' ? 'active' : ''}>FR</span>
            </button>
          </div>
          <h2>{t.auth.title}</h2>
          <p className="meta" style={{ marginBottom: 16 }}>
            {t.auth.sub}
          </p>
          <form className="form-grid" onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="email">{t.auth.email}</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="password">{t.auth.password}</label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button className="btn btn-primary btn-full" type="submit">
              {t.auth.login}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
