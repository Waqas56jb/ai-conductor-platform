import { Link } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import Icon from './icons'
import './footer.css'

// No official accounts yet: shown as "coming soon", not linked.
const SOCIALS = [
  ['linkedin', 'LinkedIn'],
  ['instagram', 'Instagram'],
  ['youtube', 'YouTube'],
  ['xsocial', 'X'],
]

function FooterLink({ href, children }) {
  return href.startsWith('/#') ? <a href={href}>{children}</a> : <Link to={href}>{children}</Link>
}

export default function Footer() {
  const { t, lang, toggleLang } = useLanguage()
  const s = t.landing.footer
  const year = new Date().getFullYear()

  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer__top">
          <div className="lp-footer__brand">
            <Link to="/" className="lp-header__brand" aria-label={t.landing.nav.home}>
              <img src="/logo.png" alt="" width="602" height="120" className="lp-header__logo" />
            </Link>
            <p>{s.tagline}</p>
            <ul className="lp-footer__social">
              {SOCIALS.map(([icon, name]) => (
                <li key={icon} title={`${name} — ${s.social}`}>
                  <Icon name={icon} />
                  <span className="lp-sr-only">{`${name} — ${s.social}`}</span>
                </li>
              ))}
            </ul>
          </div>

          {s.columns.map((col) => (
            <nav className="lp-footer__col" key={col.title} aria-label={col.title}>
              <h3>{col.title}</h3>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <FooterLink href={link.href}>{link.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="lp-footer__bottom">
          <p>
            © {year} Pratonna. {s.rights}
          </p>
          <button type="button" className="lp-lang" onClick={toggleLang} aria-label={t.landing.nav.switchLang}>
            <Icon name="globe" />
            <span className={lang === 'fr' ? 'is-active' : ''}>FR</span>
            <span aria-hidden="true">/</span>
            <span className={lang === 'en' ? 'is-active' : ''}>EN</span>
          </button>
        </div>
      </div>
    </footer>
  )
}
