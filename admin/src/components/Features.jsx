import {
  FolderKanban,
  BrainCircuit,
  Users,
  Mic,
  LayoutDashboard,
  Briefcase,
  ShieldCheck,
  Workflow,
} from 'lucide-react'
import Reveal from './ui/Reveal'

const features = [
  {
    icon: FolderKanban,
    title: 'Gestion de dossiers',
    desc: 'Suivi complet et organisé. Contrats, factures et documents centralisés, classés automatiquement par l’IA.',
    accent: 'from-brand-500 to-brand-700',
  },
  {
    icon: BrainCircuit,
    title: 'Assistant intelligent',
    desc: 'Tâches automatisées et relances. L’assistant comprend le contexte, rédige vos e-mails et prépare vos actions.',
    accent: 'from-violet-500 to-violet-600',
  },
  {
    icon: Users,
    title: 'CRM & contacts',
    desc: 'Fichiers clients centralisés, pipeline de ventes, opportunités et historique complet en un seul endroit.',
    accent: 'from-brand-500 to-violet-500',
  },
  {
    icon: Mic,
    title: 'Commandes vocales',
    desc: 'Interactions par la voix. Dictez une tâche, demandez un résumé, créez un dossier sans toucher au clavier.',
    accent: 'from-violet-500 to-brand-500',
  },
  {
    icon: LayoutDashboard,
    title: 'Tableau de bord dynamique',
    desc: 'Priorités et alertes en temps réel. Visualisez l’activité des équipes, les urgences et les indicateurs clés.',
    accent: 'from-brand-600 to-brand-400',
  },
  {
    icon: Briefcase,
    title: 'Modèles métiers adaptés',
    desc: 'Immobilier, BTP, services… des workflows prêts à l’emploi, configurables selon votre secteur.',
    accent: 'from-violet-600 to-violet-400',
  },
  {
    icon: Workflow,
    title: 'Orchestration des workflows',
    desc: 'Pratonna enchaîne les étapes : déclaration → analyse → validation → action. Zéro tâche oubliée.',
    accent: 'from-brand-500 to-violet-600',
  },
  {
    icon: ShieldCheck,
    title: 'Sécurité & conformité',
    desc: 'RGPD, sauvegardes chiffrées, isolation des données par entreprise et contrôle d’accès par rôle.',
    accent: 'from-brand-700 to-brand-500',
  },
]

export default function Features() {
  return (
    <section id="fonctionnalites" className="section bg-cloud">
      <div className="container-x">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Fonctionnalités</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-[2.6rem]">
            Tout ce dont votre équipe a besoin,{' '}
            <span className="gradient-text">au même endroit</span>
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            Un environnement de travail unifié où l'intelligence artificielle ne se contente
            pas de répondre : elle travaille comme un véritable membre de l'équipe.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={(i % 4) * 0.08}>
              <article className="group h-full rounded-2xl border border-slate-100 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-glow">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">

                  <f.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 font-display text-lg font-bold text-ink">{f.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{f.desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
