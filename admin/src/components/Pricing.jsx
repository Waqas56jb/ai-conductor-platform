import { useState } from 'react'
import { Check, Minus, Sparkles } from 'lucide-react'
import Reveal from './ui/Reveal'

const plans = [
  {
    name: 'Starter',
    tagline: 'Pour démarrer',
    monthly: 100,
    features: [
      '1 utilisateur',
      'CRM & gestion de dossiers',
      'Tâches & tableau de bord',
      'Assistant IA inclus',
      'Intégration Gmail & Agenda',
      'Support par e-mail',
    ],
    cta: 'Essai gratuit 14 jours',
    highlight: false,
  },
  {
    name: 'Pro',
    tagline: 'Le choix des équipes',
    monthly: 200,
    badge: 'Recommandé',
    features: [
      "Jusqu'à 5 utilisateurs",
      'Toutes les intégrations',
      'Génération de documents',
      'E-mails & relances automatiques',
      'Modèles métiers (Immo, BTP)',
      'Support prioritaire',
    ],
    cta: 'Essai gratuit 14 jours',
    highlight: true,
  },
  {
    name: 'Business',
    tagline: 'Pour les organisations',
    monthly: 300,
    features: [
      'Utilisateurs illimités',
      'Architecture multi-entreprises',
      'Comptabilité & facturation',
      'Rôles & permissions avancés',
      'Conformité RGPD renforcée',
      'Support prioritaire & SLA',
    ],
    cta: 'Essai gratuit 14 jours',
    highlight: false,
  },
]

const compare = [
  { label: 'Utilisateurs', values: ['1', "Jusqu'à 5", 'Illimités'] },
  { label: 'CRM & gestion de dossiers', values: [true, true, true] },
  { label: 'Assistant IA', values: [true, true, true] },
  { label: 'Toutes les intégrations', values: [false, true, true] },
  { label: 'Génération de documents', values: [false, true, true] },
  { label: 'WhatsApp & relances automatiques', values: [false, true, true] },
  { label: 'Architecture multi-entreprises', values: [false, false, true] },
  { label: 'Comptabilité & facturation', values: [false, false, true] },
  { label: 'Support', values: ['E-mail', 'Prioritaire', 'Prioritaire + SLA'] },
]

function Cell({ v }) {
  if (v === true) return <Check className="mx-auto h-4.5 w-4.5 text-brand-500" />
  if (v === false) return <Minus className="mx-auto h-4 w-4 text-slate-300" />
  return <span className="text-[13.5px] font-semibold text-ink-soft">{v}</span>
}

export default function Pricing() {
  const [yearly, setYearly] = useState(true)
  const priceFor = (p) => (yearly ? Math.round((p.monthly * 10) / 12) : p.monthly)

  return (
    <section id="tarifs" className="section bg-white">
      <div className="container-x">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Tarifs</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-[2.6rem]">
            Un prix simple, <span className="gradient-text">une valeur immense</span>
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            Essai gratuit de 14 jours sur toutes les offres. Sans carte bancaire, sans engagement.
          </p>

          {/* Bascule mensuel / annuel */}
          <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-cloud p-1.5">
            <button
              onClick={() => setYearly(false)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                !yearly ? 'bg-white text-ink shadow-card' : 'text-ink-soft'
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                yearly ? 'bg-brand-gradient text-white shadow-glow' : 'text-ink-soft'
              }`}
            >
              Annuel <span className="ml-1 text-xs opacity-90">2 mois offerts</span>
            </button>
          </div>
        </Reveal>

        {/* Cartes */}
        <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-3">
          {plans.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.1}>
              <div
                className={`relative flex h-full flex-col rounded-3xl border p-7 transition-all duration-300 ${
                  p.highlight
                    ? 'border-transparent bg-brand-gradient text-white shadow-glow lg:-translate-y-3'
                    : 'border-slate-200 bg-white text-ink shadow-card hover:border-brand-200 hover:shadow-soft'
                }`}
              >
                {p.badge && (
                  <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-brand-700 shadow-card">
                    <Sparkles className="h-3.5 w-3.5" />
                    {p.badge}
                  </span>
                )}

                <h3 className={`font-display text-xl font-extrabold ${p.highlight ? 'text-white' : 'text-ink'}`}>
                  {p.name}
                </h3>
                <p className={`mt-1 text-sm ${p.highlight ? 'text-brand-100' : 'text-ink-muted'}`}>
                  {p.tagline}
                </p>

                <div className="mt-6 flex items-end gap-1">
                  <span className="font-display text-5xl font-extrabold">{priceFor(p)}€</span>
                  <span className={`mb-2 text-sm ${p.highlight ? 'text-brand-100' : 'text-ink-muted'}`}>
                    /mois
                  </span>
                </div>
                <p className={`mt-1 text-xs ${p.highlight ? 'text-brand-100' : 'text-ink-muted'}`}>
                  {yearly ? 'facturé annuellement · 2 mois offerts' : 'facturé mensuellement'}
                </p>

                <ul className="mt-6 flex-1 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[14.5px]">
                      <Check
                        className={`mt-0.5 h-4.5 w-4.5 shrink-0 ${
                          p.highlight ? 'text-white' : 'text-brand-500'
                        }`}
                      />
                      <span className={p.highlight ? 'text-brand-50' : 'text-ink-soft'}>{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#demonstration"
                  className={`mt-7 w-full ${
                    p.highlight
                      ? 'btn bg-white text-brand-700 hover:-translate-y-0.5 hover:shadow-glow'
                      : 'btn-primary'
                  }`}
                >
                  {p.cta}
                </a>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Tableau comparatif */}
        <Reveal delay={0.15}>
          <div className="mt-16 overflow-hidden rounded-3xl border border-slate-200 shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="bg-cloud">
                    <th className="px-6 py-4 font-display text-sm font-bold text-ink">
                      Comparer les offres
                    </th>
                    {plans.map((p) => (
                      <th
                        key={p.name}
                        className={`px-4 py-4 text-center font-display text-sm font-extrabold ${
                          p.highlight ? 'text-brand-600' : 'text-ink'
                        }`}
                      >
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compare.map((row, r) => (
                    <tr key={row.label} className={r % 2 ? 'bg-white' : 'bg-cloud/40'}>
                      <td className="px-6 py-3.5 text-[14px] font-medium text-ink-soft">{row.label}</td>
                      {row.values.map((v, c) => (
                        <td key={c} className="px-4 py-3.5 text-center">
                          <Cell v={v} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        <p className="mt-8 text-center text-sm text-ink-muted">
          Paiement sécurisé par Stripe · Sans frais cachés · Résiliation en 1 clic
        </p>
      </div>
    </section>
  )
}
