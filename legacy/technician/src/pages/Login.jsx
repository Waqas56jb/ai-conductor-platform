import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { useTechData } from '../context/TechDataContext'

const IMG =
  'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1400&q=80'

export default function Login() {
  const { t, lang, toggleLang } = useLanguage()
  const { login, authed } = useTechData()
  const navigate = useNavigate()
  const [email, setEmail] = useState('marc.dupont@pratonna.tech')
  const [password, setPassword] = useState('password')

  if (authed) return <Navigate to="/dashboard" replace />

  function handleSubmit(e) {
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
            <span className="meta">{t.auth.note}</span>
            <button type="button" className="lang-toggle" onClick={toggleLang}>
              <span className={lang === 'en' ? 'active' : ''}>EN</span>
              {' / '}
              <span className={lang === 'fr' ? 'active' : ''}>FR</span>
            </button>
          </div>
          <h2>{t.auth.loginTitle}</h2>
          <p>{t.auth.loginSub}</p>
          <form className="form-grid" onSubmit={handleSubmit}>
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
          <p className="auth-switch">
            {t.auth.noAccount} <Link to="/signup">{t.auth.signupLink}</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
