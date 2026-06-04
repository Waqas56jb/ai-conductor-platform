import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowRight, ArrowLeft, MailCheck } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    // Frontend uniquement — l'envoi du lien sera branché au backend ultérieurement.
    setSent(true)
  }

  return (
    <AuthLayout
      title={sent ? 'Vérifiez vos e-mails' : 'Mot de passe oublié ?'}
      subtitle={
        sent
          ? 'Si un compte existe, vous recevrez un lien de réinitialisation.'
          : 'Entrez votre e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.'
      }
      points={[
        'Lien de réinitialisation sécurisé et temporaire',
        'Vos données restent chiffrées et protégées',
        'Assistance disponible si besoin',
      ]}
    >
      {sent ? (
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-4">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm text-ink-soft">
              Un e-mail a été envoyé à <strong className="text-ink">{email || 'votre adresse'}</strong>.
              Cliquez sur le lien reçu pour choisir un nouveau mot de passe.
            </p>
          </div>

          <button type="button" onClick={() => setSent(false)} className="btn-ghost w-full">
            Renvoyer le lien
          </button>

          <Link
            to="/connexion"
            className="flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la connexion
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@entreprise.com"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-[15px] text-ink outline-none transition placeholder:text-ink-muted/70 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full">
            Envoyer le lien
            <ArrowRight className="h-4 w-4" />
          </button>

          <Link
            to="/connexion"
            className="flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la connexion
          </Link>
        </form>
      )}
    </AuthLayout>
  )
}
