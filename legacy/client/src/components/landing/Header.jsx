import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import Icon from './icons'
import './header.css'

// Links are absolute ("/#…") so they also work from the legal pages.
const LINKS = [
  ['/#fonctionnalites', 'features'],
  ['/#solutions', 'solutions'],
  ['/#tarifs', 'pricing'],
  ['/#demo', 'demo'],
  ['/#contact', 'contact'],
]

function LangToggle({ lang, onToggle, label }) {
  return (
    <button type="button" className="lp-lang" onClick={onToggle} aria-label={label}>
      <span className={lang === 'fr' ? 'is-active' : ''}>FR</span>
      <span aria-hidden="true">/</span>
      <span className={lang === 'en' ? 'is-active' : ''}>EN</span>
    </button>
  )
}

export default function Header() {
  const { t, lang, toggleLang } = useLanguage()
  const n = t.landing.nav
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const burgerRef = useRef(null)
  const firstLinkRef = useRef(null)
  const wasOpen = useRef(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Drawer: lock page scroll, close on Escape, manage focus.
  useEffect(() => {
    if (!open) {
      if (wasOpen.current) burgerRef.current?.focus()
      wasOpen.current = false
      return
    }
    wasOpen.current = true
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    firstLinkRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    const onResize = () => window.innerWidth > 900 && setOpen(false)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  // Close the drawer first, then scroll once the page is unlocked.
  function onDrawerLink(e, href) {
    const hash = href.slice(1)
    if (window.location.pathname !== '/') return setOpen(false)
    e.preventDefault()
    setOpen(false)
    requestAnimationFrame(() => {
      document.querySelector(hash)?.scrollIntoView()
      window.history.pushState(null, '', hash)
    })
  }

  // The drawer is a sibling of <header>, not a child: the header's
  // backdrop-filter would otherwise become the containing block of the
  // fixed-position drawer and clip it.
  return (
    <>
      <header className={`lp-header${scrolled || open ? ' is-scrolled' : ''}`}>
        <div className="lp-container lp-header__bar">
          <Link to="/" className="lp-header__brand" aria-label={n.home}>
            <span className="lp-header__logo" aria-hidden="true" />
            Pratonna
          </Link>

          <nav className="lp-header__nav" aria-label={n.menu}>
            <ul>
              {LINKS.map(([href, key]) => (
                <li key={key}>
                  <a href={href}>{n[key]}</a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lp-header__actions">
            <LangToggle lang={lang} onToggle={toggleLang} label={n.switchLang} />
            <Link to="/login" className="ai-btn ai-btn--ghost ai-btn--sm lp-header__login">
              {n.login}
            </Link>
            <Link to="/signup" className="ai-btn ai-btn--primary ai-btn--sm">
              {n.signup}
            </Link>
            <button
              ref={burgerRef}
              type="button"
              className={`lp-burger${open ? ' is-open' : ''}`}
              aria-expanded={open}
              aria-controls="lp-drawer"
              aria-label={open ? n.closeMenu : n.openMenu}
              onClick={() => setOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <div
        id="lp-drawer"
        className={`lp-drawer${open ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={n.menu}
        inert={!open}
      >
        <button
          type="button"
          className="lp-drawer__scrim"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
        <div className="lp-drawer__panel">
          <ul className="lp-drawer__links">
            {LINKS.map(([href, key], i) => (
              <li key={key}>
                <a href={href} ref={i === 0 ? firstLinkRef : undefined} onClick={(e) => onDrawerLink(e, href)}>
                  {n[key]}
                  <Icon name="arrow" />
                </a>
              </li>
            ))}
          </ul>
          <div className="lp-drawer__footer">
            <LangToggle lang={lang} onToggle={toggleLang} label={n.switchLang} />
            <Link to="/login" className="ai-btn ai-btn--ghost ai-btn--block" onClick={() => setOpen(false)}>
              {n.login}
            </Link>
            <Link to="/signup" className="ai-btn ai-btn--primary ai-btn--block" onClick={() => setOpen(false)}>
              {n.signup}
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
