import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'

/** Marque cliquable qui ramène à l'accueil */
function BrandMark({ light = false }) {
  return (
    <Link to="/" className="group inline-flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient shadow-glow transition-transform duration-300 group-hover:scale-105">
        <svg viewBox="0 0 64 64" className="h-6 w-6" fill="none">
          <path
            d="M21 17h13.5c6.6 0 11 4 11 10s-4.4 10-11 10H29v10h-8V17Zm8 14h5c2.6 0 4.3-1.5 4.3-4s-1.7-4-4.3-4h-5v8Z"
            fill="white"
          />
          <circle cx="44" cy="20" r="4" fill="white" opacity="0.9" />
        </svg>
      </span>
      <span
        className={`font-display text-xl font-extrabold tracking-tight ${
          light ? 'text-white' : 'text-ink'
        }`}
      >
        PRATONNA
      </span>
    </Link>
  )
}

/**
 * Mise en page d'authentification — panneau de marque (gauche) + formulaire (droite).
 * 100% responsive : le panneau de marque est masqué sous lg.
 */
export default function AuthLayout({ title, subtitle, children, points }) {
  const bullets = points || [
    "Orchestration intelligente de toutes vos opérations",
    'CRM, tâches, documents et e-mails centralisés',
    'Données isolées par entreprise · conforme RGPD',
  ]

  return (
    <div className="grid min-h-[100svh] lg:grid-cols-2">
      {/* Panneau de marque */}
      <aside className="relative hidden overflow-hidden bg-brand-gradient p-12 text-white lg:flex lg:flex-col lg:justify-between">
        {/* Décors */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-80 w-80 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-10" />

        <div className="relative">
          <BrandMark light />
        </div>

        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[13px] font-semibold backdrop-blur">
            <Sparkles className="h-4 w-4" />
            Votre 6ème collaborateur, 100% IA
          </span>
          <h2 className="mt-6 font-display text-4xl font-extrabold leading-tight tracking-tight">
            Pilotez votre entreprise depuis un seul endroit.
          </h2>
          <ul className="mt-8 space-y-4">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 text-[15px] text-brand-50">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-white" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-3 text-sm text-brand-100">
          <ShieldCheck className="h-5 w-5" />
          Hébergement en Europe · Chiffrement de bout en bout
        </div>
      </aside>

      {/* Zone formulaire */}
      <main className="relative flex flex-col bg-cloud">
        {/* En-tête mobile / barre supérieure */}
        <div className="flex items-center justify-between px-6 py-5 sm:px-10">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-brand-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au site
          </Link>
        </div>

        {/* Formulaire centré */}
        <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-10">
          <div className="w-full max-w-md">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
              {title}
            </h1>
            <p className="mt-2 text-[15px] text-ink-soft">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>

        <p className="px-6 pb-6 text-center text-xs text-ink-muted sm:px-10">
          © {new Date().getFullYear()} Pratonna · Paiement sécurisé par Stripe
        </p>
      </main>
    </div>
  )
}
