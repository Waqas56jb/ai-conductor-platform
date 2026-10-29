import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import '../components/landing/landing.css'
import '../components/hero/hero.css'
import Header from '../components/landing/Header'
import Footer from '../components/landing/Footer'
import Icon from '../components/landing/icons'

// Placeholder until the legal texts are written (page: 'mentions' | 'cgu' | 'privacy').
export default function LegalPage({ page }) {
  const { t } = useLanguage()
  const s = t.landing.legal
  const title = s.titles[page]

  useEffect(() => {
    document.body.classList.add('lp-body')
    window.scrollTo(0, 0)
    return () => document.body.classList.remove('lp-body')
  }, [])

  useEffect(() => {
    document.title = `${title} — Pratonna`
  }, [title])

  return (
    <div className="lp">
      <Header />
      <main className="lp-section">
        <div className="lp-container" style={{ maxWidth: 760 }}>
          <h1 className="lp-title">{title}</h1>
          <p className="lp-sub" style={{ marginLeft: 0 }}>
            {s.draft}
          </p>
          <p className="lp-sub" style={{ marginLeft: 0 }}>
            {s.contact} <a href="mailto:contact@pratonna.com">contact@pratonna.com</a>.
          </p>
          <Link to="/" className="ai-btn ai-btn--ghost" style={{ marginTop: '2rem' }}>
            {s.back}
            <Icon name="arrow" />
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
