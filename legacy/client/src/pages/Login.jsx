import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'

const AUTH_IMG =
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80'

export default function Login() {
  const { t, lang, toggleLang } = useLanguage()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    navigate('/dashboard')
  }

  return (
    <div className="auth-page">
      <aside className="auth-visual">
        <img src={AUTH_IMG} alt="" />
        <div className="auth-visual-overlay">
          <h1>{t.brand}</h1>
          <p>{t.footer.tagline}</p>
        </div>
      </aside>

      <main className="auth-panel">
        <div className="auth-card">
          <div className="auth-top">
            <Link to="/" className="back-link">
              ← {t.login.back}
            </Link>
            <button type="button" className="lang-toggle" onClick={toggleLang}>
              <span className={lang === 'en' ? 'active' : ''}>EN</span>
              {' / '}
              <span className={lang === 'fr' ? 'active' : ''}>FR</span>
            </button>
          </div>

          <h2>{t.login.title}</h2>
          <p>{t.login.sub}</p>

          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">{t.login.email}</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="password">{t.login.password}</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full">
              {t.login.submit}
            </button>
          </form>

          <p className="auth-switch">
            {t.login.noAccount} <Link to="/signup">{t.login.signupLink}</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
