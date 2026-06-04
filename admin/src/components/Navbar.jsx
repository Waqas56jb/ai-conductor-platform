import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X, ChevronDown, Sparkles } from 'lucide-react'
import Logo from './Logo'

const links = [
  { label: 'Fonctionnalités', href: '#fonctionnalites' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Intégrations', href: '#integrations' },
  { label: 'Tarifs', href: '#tarifs' },
  { label: 'FAQ', href: '#faq' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Empêche le défilement du corps quand le menu mobile est ouvert
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => (document.body.style.overflow = '')
  }, [open])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-slate-200/70 bg-white/80 backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      <nav className="container-x flex h-16 items-center justify-between sm:h-[72px]">
        <Logo />

        {/* Liens desktop */}
        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="rounded-lg px-4 py-2 text-[15px] font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-600"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <a
              href="#demonstration"
              className="flex items-center gap-1 rounded-lg px-4 py-2 text-[15px] font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-600"
            >
              Démonstration <ChevronDown className="h-4 w-4" />
            </a>
          </li>
        </ul>

        {/* Actions desktop */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/connexion"
            className="rounded-xl px-4 py-2.5 text-[15px] font-semibold text-ink transition-colors hover:text-brand-600"
          >
            Connexion
          </Link>
          <Link to="/inscription" className="btn-primary !py-2.5 !px-5 text-sm">
            <Sparkles className="h-4 w-4" />
            Inscription
          </Link>
        </div>

        {/* Bouton menu mobile */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white/70 text-ink lg:hidden"
          aria-label="Ouvrir le menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Panneau mobile */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-slate-200 bg-white/95 backdrop-blur-xl lg:hidden"
          >
            <div className="container-x flex flex-col gap-1 py-4">
              {[...links, { label: 'Démonstration', href: '#demonstration' }].map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-base font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-600"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-3 px-1">
                <Link to="/connexion" onClick={() => setOpen(false)} className="btn-ghost">
                  Connexion
                </Link>
                <Link to="/inscription" onClick={() => setOpen(false)} className="btn-primary">
                  Inscription
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
