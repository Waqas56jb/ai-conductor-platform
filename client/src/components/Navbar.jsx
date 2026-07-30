import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'

export default function Navbar() {
  const { t, lang, toggleLang } = useLanguage()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
      <div className="container nav">
        <Link to="/" className="brand">
          {t.brand}
        </Link>

        <nav className="nav-links" aria-label="Primary">
          <a href="#how">{t.nav.how}</a>
          <a href="#why">{t.nav.why}</a>
        </nav>

        <div className="nav-actions">
          <button type="button" className="lang-toggle" onClick={toggleLang} aria-label="Switch language">
            <span className={lang === 'en' ? 'active' : ''}>EN</span>
            {' / '}
            <span className={lang === 'fr' ? 'active' : ''}>FR</span>
          </button>
          <Link to="/login" className="btn btn-ghost">
            {t.nav.login}
          </Link>
          <Link to="/signup" className="btn btn-primary">
            {t.nav.signup}
          </Link>
        </div>
      </div>
    </header>
  )
}
