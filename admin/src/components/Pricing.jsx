import { useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import Reveal from './ui/Reveal'

const plans = [
  {
    name: 'Starter',
    tagline: 'Pour démarrer en équipe',
    monthly: 29,
    yearly: 24,
    features: [
      "Jusqu'à 5 collaborateurs",
      'CRM & gestion de dossiers',
      'Tableau de bord & tâches',
      'Assistant IA (base)',
      'Intégration Gmail & Agenda',
      'Support par e-mail',
    ],
    cta: 'Commencer',
    highlight: false,
  },
  {
    name: 'Business',
    tagline: 'Le choix des entreprises en croissance',
    monthly: 79,
    yearly: 65,
    features: [
      "Jusqu'à 25 collaborateurs",
      'Tout Starter, plus :',
      'Orchestration IA avancée',
      'WhatsApp + relances automatiques',
      'Modèles métiers (Immo, BTP)',
      'Rôles & permissions avancés',
      'Support prioritaire',
    ],
    cta: 'Essai gratuit 14 jours',
    highlight: true,
  },
  {
    name: 'Entreprise',
    tagline: 'Multi-sociétés & sur-mesure',
    monthly: null,
    yearly: null,
    features: [
      'Collaborateurs illimités',
      'Architecture multi-entreprises',
      'Comptabilité & facturation',
      'Intégrations sur-mesure',
      'Conformité RGPD renforcée',
      'Accompagnement dédié',
    ],
    cta: 'Nous contacter',
    highlight: false,
  },
]

export default function Pricing() {
  const [yearly, setYearly] = useState(true)

  return (
    <section id="tarifs" className="section bg-white">
      <div className="container-x">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Tarifs</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-[2.6rem]">
            Un prix simple, <span className="gradient-text">une valeur immense</span>
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            Choisissez l'offre adaptée à votre équipe. Changez ou annulez à tout moment.
          </p>

          {/* Bascule mensuel / annuel */}
          <div className="mt-7 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-cloud p-1.5">
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
              Annuel <span className="ml-1 text-xs opacity-90">−20%</span>
            </button>
          </div>
        </Reveal>

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
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-brand-700 shadow-card">
                    <Sparkles className="h-3.5 w-3.5" />
                    Le plus populaire
                  </span>
                )}

                <h3 className={`font-display text-xl font-extrabold ${p.highlight ? 'text-white' : 'text-ink'}`}>
                  {p.name}
                </h3>
                <p className={`mt-1 text-sm ${p.highlight ? 'text-brand-100' : 'text-ink-muted'}`}>
                  {p.tagline}
                </p>

                <div className="mt-6 flex items-end gap-1">
                  {p.monthly === null ? (
                    <span className="font-display text-4xl font-extrabold">Sur devis</span>
                  ) : (
                    <>
                      <span className="font-display text-5xl font-extrabold">
                        {yearly ? p.yearly : p.monthly}€
                      </span>
                      <span className={`mb-2 text-sm ${p.highlight ? 'text-brand-100' : 'text-ink-muted'}`}>
                        /mois
                      </span>
                    </>
                  )}
                </div>

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

        <p className="mt-8 text-center text-sm text-ink-muted">
          Paiement sécurisé par Stripe · Sans frais cachés · Résiliation en 1 clic
        </p>
      </div>
    </section>
  )
}
