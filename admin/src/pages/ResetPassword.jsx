import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (pwd.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (pwd !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setError('')
    // Frontend uniquement — la mise à jour sera branchée au backend ultérieurement.
    setDone(true)
  }

  const inputBase =
    'w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-11 text-[15px] text-ink outline-none transition placeholder:text-ink-muted/70 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15'

  return (
    <AuthLayout
      title={done ? 'Mot de passe mis à jour' : 'Nouveau mot de passe'}
      subtitle={
        done
          ? 'Votre mot de passe a été réinitialisé avec succès.'
          : 'Choisissez un nouveau mot de passe sécurisé pour votre compte.'
      }
      points={[
        '8 caractères minimum recommandés',
        'Mélangez lettres, chiffres et symboles',
        'Connexion sécurisée et chiffrée',
      ]}
    >
      {done ? (
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm text-ink-soft">
              Vous pouvez désormais vous connecter avec votre nouveau mot de passe.
            </p>
          </div>
          <button type="button" onClick={() => navigate('/connexion')} className="btn-primary w-full">
            Aller à la connexion
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nouveau mot de passe */}
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="8 caractères minimum"
                className={inputBase}
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

          {/* Confirmation */}
          <div>
            <label htmlFor="confirm" className="mb-1.5 block text-sm font-semibold text-ink">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
              <input
                id="confirm"
                type={showPwd ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Retapez le mot de passe"
                className={inputBase}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{error}</p>
          )}

          <button type="submit" className="btn-primary w-full">
            Réinitialiser le mot de passe
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-ink-muted">
            <ShieldCheck className="h-4 w-4 text-brand-500" />
            Lien de réinitialisation sécurisé
          </p>

          <p className="text-center text-sm text-ink-soft">
            <Link to="/connexion" className="font-semibold text-brand-600 hover:text-brand-700">
              Retour à la connexion
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  )
}
