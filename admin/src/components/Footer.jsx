import { useState } from 'react'
import { Mail, MapPin, Linkedin, Twitter, Github, Send, ArrowUp } from 'lucide-react'
import Logo from './Logo'

const columns = [
  {
    title: 'Produit',
    links: [
      { label: 'Fonctionnalités', href: '#fonctionnalites' },
      { label: 'Solutions métiers', href: '#solutions' },
      { label: 'Intégrations', href: '#integrations' },
      { label: 'Tarifs', href: '#tarifs' },
      { label: 'Démonstration', href: '#demonstration' },
    ],
  },
  {
    title: 'Entreprise',
    links: [
      { label: 'À propos', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Carrières', href: '#' },
      { label: 'Contact', href: '#' },
      { label: 'Partenaires', href: '#' },
    ],
  },
  {
    title: 'Ressources',
    links: [
      { label: "Centre d'aide", href: '#' },
      { label: 'Documentation', href: '#' },
      { label: 'API développeurs', href: '#' },
      { label: 'FAQ', href: '#faq' },
      { label: 'Statut des services', href: '#' },
    ],
  },
  {
    title: 'Légal',
    links: [
      { label: 'Mentions légales', href: '#' },
      { label: 'Confidentialité', href: '#' },
      { label: 'CGU / CGV', href: '#' },
      { label: 'Conformité RGPD', href: '#' },
      { label: 'Cookies', href: '#' },
    ],
  },
]

export default function Footer() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (!email) return
    setSent(true)
    setEmail('')
    setTimeout(() => setSent(false), 3500)
  }

  return (
    <footer className="relative overflow-hidden bg-ink text-slate-300">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.05]" />
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-brand-500/15 blur-3xl" />

      <div className="container-x relative">
        {/* Bloc newsletter */}
        <div className="grid gap-10 border-b border-white/10 py-14 lg:grid-cols-2 lg:items-center">
          <div>
            <h3 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
              Restez à la pointe de l'automatisation
            </h3>
            <p className="mt-3 max-w-md text-slate-400">
              Recevez nos conseils sur l'IA, le CRM et la productivité des équipes. Un e-mail
              utile, jamais de spam.
            </p>
          </div>

          <form onSubmit={submit} className="flex w-full flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre adresse e-mail professionnelle"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-white placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/20"
              />
            </div>
            <button type="submit" className="btn-primary shrink-0">
              {sent ? 'Inscrit ✓' : "S'inscrire"}
              {!sent && <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>

        {/* Liens */}
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Logo light />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              Pratonna — Le 6ème membre de votre équipe. La plateforme SaaS qui orchestre vos
              opérations grâce à un assistant intelligent, toujours actif.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-400" /> Paris, France
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand-400" /> contact@pratonna.com
              </li>
            </ul>
            <div className="mt-5 flex gap-3">
              {[Linkedin, Twitter, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-colors hover:border-brand-400 hover:bg-brand-gradient hover:text-white"
                  aria-label="Réseau social"
                >
                  <Icon className="h-4.5 w-4.5" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-slate-400 transition-colors hover:text-brand-300"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bas de page */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 py-7 sm:flex-row">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Pratonna. Tous droits réservés.
          </p>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Tous les systèmes opérationnels
            </span>
            <a
              href="#top"
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-brand-gradient hover:text-white"
              aria-label="Remonter en haut"
            >
              <ArrowUp className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
