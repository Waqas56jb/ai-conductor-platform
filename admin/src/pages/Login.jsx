import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'

export default function Login() {
  const [showPwd, setShowPwd] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    // Frontend uniquement — l'authentification sera branchée au backend ultérieurement.
  }

  return (
    <AuthLayout
      title="Bon retour 👋"
      subtitle="Connectez-vous à votre espace Pratonna pour piloter vos équipes."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-[15px] text-ink outline-none transition placeholder:text-ink-muted/70 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
            />
          </div>
        </div>

        {/* Mot de passe */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-semibold text-ink">
              Mot de passe
            </label>
            <Link
              to="/mot-de-passe-oublie"
              className="text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
            <input
              id="password"
              type={showPwd ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="••••••••"
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

        {/* Se souvenir */}
        <label className="flex items-center gap-2.5 text-sm text-ink-soft">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30"
          />
          Rester connecté
        </label>

        <button type="submit" className="btn-primary w-full">
          Se connecter
          <ArrowRight className="h-4 w-4" />
        </button>

        {/* Séparateur */}
        <div className="flex items-center gap-4">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">ou</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        {/* Google */}
        <button type="button" className="btn-ghost w-full">
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
            />
          </svg>
          Continuer avec Google
        </button>

        <p className="text-center text-sm text-ink-soft">
          Nouveau sur Pratonna ?{' '}
          <Link to="/inscription" className="font-semibold text-brand-600 hover:text-brand-700">
            Créer un compte
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
