import { useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Building2, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'

export default function Signup() {
  const [showPwd, setShowPwd] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    // Frontend uniquement — la création de compte sera branchée au backend ultérieurement.
  }

  const inputBase =
    'w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-[15px] text-ink outline-none transition placeholder:text-ink-muted/70 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15'

  return (
    <AuthLayout
      title="Créez votre espace"
      subtitle="Ouvrez le compte administrateur de votre entreprise en quelques secondes."
      points={[
        "Vous créez ensuite les comptes de vos collaborateurs",
        'Chaque entreprise dispose d’un espace isolé et sécurisé',
        'Essai gratuit de 14 jours, sans carte bancaire',
      ]}
    >
      {/* Bandeau essai gratuit */}
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">
        <Sparkles className="h-4 w-4" />
        14 jours d'essai gratuit · sans engagement
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nom complet */}
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-ink">
            Nom complet
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
            <input id="name" type="text" required autoComplete="name" placeholder="Martin Dupont" className={inputBase} />
          </div>
        </div>

        {/* Entreprise */}
        <div>
          <label htmlFor="company" className="mb-1.5 block text-sm font-semibold text-ink">
            Nom de l'entreprise
          </label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
            <input id="company" type="text" required placeholder="Votre société" className={inputBase} />
          </div>
        </div>

        {/* E-mail */}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink">
            E-mail professionnel
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="vous@entreprise.com"
              className={inputBase}
            />
          </div>
        </div>

        {/* Mot de passe */}
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink">
            Mot de passe
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
            <input
              id="password"
              type={showPwd ? 'text' : 'password'}
              required
              autoComplete="new-password"
              minLength={8}
              placeholder="8 caractères minimum"
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-11 text-[15px] text-ink outline-none transition placeholder:text-ink-muted/70 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted transition hover:text-brand-600"
            >
              {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* CGU */}
        <label className="flex items-start gap-2.5 text-sm text-ink-soft">
          <input
            type="checkbox"
            required
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30"
          />
          <span>
            J'accepte les{' '}
            <a href="#" className="font-semibold text-brand-600 hover:text-brand-700">
              conditions d'utilisation
            </a>{' '}
            et la{' '}
            <a href="#" className="font-semibold text-brand-600 hover:text-brand-700">
              politique de confidentialité
            </a>
            .
          </span>
        </label>

        <button type="submit" className="btn-primary w-full">
          Créer mon compte
          <ArrowRight className="h-4 w-4" />
        </button>

        <p className="text-center text-sm text-ink-soft">
          Vous avez déjà un compte ?{' '}
          <Link to="/connexion" className="font-semibold text-brand-600 hover:text-brand-700">
            Se connecter
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
