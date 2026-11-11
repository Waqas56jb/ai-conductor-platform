import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import { appLink } from '../../appUrl'
import { demoHref } from '../../demoHref'
import DemoCta from './DemoCta'
import Icon from './icons'
import './header.css'

// Anchors are absolute ("/#…") so they also work from the other pages.
const LINKS = [
  ['/immobilier', 'realEstate'],
  ['/btp', 'trades'],
  ['/#fonctionnalites', 'features'],
  ['/#tarifs', 'pricing'],
  ['/#contact', 'contact'],
]

function NavLink({ href, children, ...props }) {
  return href.startsWith('/#') ? (
    <a href={href} {...props}>
      {children}
    </a>
  ) : (
    <Link to={href} {...props}>
      {children}
    </Link>
  )
}

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
    if (!href.startsWith('/#') || window.location.pathname !== '/') return setOpen(false)
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
            <img src="/logo.png" alt="" width="602" height="120" className="lp-header__logo" />
          </Link>

          <nav className="lp-header__nav" aria-label={n.menu}>
            <ul>
              {LINKS.map(([href, key]) => (
                <li key={key}>
                  <NavLink href={href}>{n[key]}</NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lp-header__actions">
            <LangToggle lang={lang} onToggle={toggleLang} label={n.switchLang} />
            <a href={appLink('/login')} className="ai-btn ai-btn--ghost ai-btn--sm lp-header__login">
              {n.login}
            </a>
            <DemoCta placement="header" href={demoHref()} className="ai-btn ai-btn--primary ai-btn--sm lp-header__demo">
              {n.freeDemo}
            </DemoCta>
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
                <NavLink href={href} ref={i === 0 ? firstLinkRef : undefined} onClick={(e) => onDrawerLink(e, href)}>
                  {n[key]}
                  <Icon name="arrow" />
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="lp-drawer__footer">
            <LangToggle lang={lang} onToggle={toggleLang} label={n.switchLang} />
            <a href={appLink('/login')} className="ai-btn ai-btn--ghost ai-btn--block">
              {n.login}
            </a>
            <a href={appLink('/signup')} className="ai-btn ai-btn--ghost ai-btn--block">
              {n.signup}
            </a>
            <DemoCta
              placement="menu"
              href={demoHref()}
              className="ai-btn ai-btn--primary ai-btn--block"
              onClick={(e) => {
                const form = document.getElementById('demo')
                if (!form) return setOpen(false)
                // Same as the drawer links: unlock the page first, then scroll.
                e.preventDefault()
                setOpen(false)
                requestAnimationFrame(() => form.scrollIntoView())
              }}
            >
              {n.freeDemoLong}
            </DemoCta>
          </div>
        </div>
      </div>
    </>
  )
}
