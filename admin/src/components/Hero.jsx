import { motion } from 'framer-motion'
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  Users,
  FolderKanban,
  Calendar,
  Settings,
  Bell,
  TrendingUp,
} from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
}

export default function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden bg-hero-radial pt-24 pb-16 sm:pt-28 lg:pb-24"
    >
      {/* Décors d'arrière-plan */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.55]" />
      <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="container-x relative">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          {/* Colonne texte */}
          <div className="text-center lg:text-left">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="inline-flex"
            >
              <span className="chip">
                <Sparkles className="h-4 w-4" />
                Le SaaS qui orchestre vos équipes
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              initial="hidden"
              animate="show"
              className="mt-5 font-display text-[2.5rem] font-extrabold leading-[1.07] tracking-tight text-ink sm:text-5xl lg:text-[3.5rem]"
            >
              Votre <span className="gradient-text">6ème collaborateur</span>,
              <br className="hidden sm:block" /> 100% IA.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              initial="hidden"
              animate="show"
              className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-soft lg:mx-0"
            >
              Optimisez, pilotez, déléguez avec un assistant intelligent. Pratonna centralise
              votre CRM, vos tâches, vos e-mails et vos équipes — puis{' '}
              <strong className="text-ink">organise et priorise le travail à votre place.</strong>
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              initial="hidden"
              animate="show"
              className="mt-7 flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
            >
              <a href="#demonstration" className="btn-primary w-full sm:w-auto">
                Demander une démo
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#tarifs"
                className="inline-flex items-center gap-1.5 px-2 py-2 text-[15px] font-semibold text-ink-soft transition-colors hover:text-brand-600"
              >
                Voir les tarifs
                <ArrowRight className="h-4 w-4" />
              </a>
            </motion.div>

            {/* Preuve sociale */}
            <motion.div
              variants={fadeUp}
              custom={4}
              initial="hidden"
              animate="show"
              className="mt-6 flex items-center justify-center gap-3 lg:justify-start"
            >
              <div className="flex -space-x-2.5">
                {[
                  'from-brand-500 to-violet-600',
                  'from-violet-500 to-brand-500',
                  'from-brand-600 to-brand-400',
                  'from-violet-600 to-violet-400',
                ].map((g, i) => (
                  <span
                    key={i}
                    className={`grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br ${g} text-[11px] font-bold text-white ring-2 ring-white`}
                  >
                    {['ML', 'JD', 'SA', 'TB'][i]}
                  </span>
                ))}
              </div>
              <p className="text-sm text-ink-soft">
                Déjà adopté par <strong className="text-ink">40+ équipes</strong> en France
              </p>
            </motion.div>

            <motion.ul
              variants={fadeUp}
              custom={5}
              initial="hidden"
              animate="show"
              className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-muted lg:justify-start"
            >
              {['Sans engagement', 'Conforme RGPD', 'Mise en route en 5 min'].map((t) => (
                <li key={t} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-500" />
                  {t}
                </li>
              ))}
            </motion.ul>
          </div>

          {/* Colonne visuelle */}
          <HeroVisual />
        </div>
      </div>

      {/* Vague de séparation */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <svg viewBox="0 0 1440 120" className="block w-full" preserveAspectRatio="none">
          <path
            fill="#f6f8ff"
            d="M0,64L60,58.7C120,53,240,43,360,48C480,53,600,75,720,80C840,85,960,75,1080,64C1200,53,1320,43,1380,37.3L1440,32L1440,120L0,120Z"
          />
        </svg>
      </div>
    </section>
  )
}

/* Maquette produit — interface réelle de Pratonna (aucune photo, 100% UI) */
function HeroVisual() {
  const navIcons = [LayoutDashboard, FolderKanban, Users, Calendar, Settings]
  const stats = [
    { label: 'Tâches du jour', value: '24', tint: 'text-brand-600 bg-brand-50' },
    { label: 'Clients actifs', value: '138', tint: 'text-violet-600 bg-violet-100/60' },
    { label: 'Devis en cours', value: '12', tint: 'text-emerald-600 bg-emerald-50' },
  ]
  const bars = [38, 62, 48, 80, 56, 90, 70]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      className="relative mx-auto hidden w-full max-w-[580px] lg:block"
    >
      {/* Halos décoratifs */}
      <div className="absolute -inset-6 -z-10 rounded-[2.4rem] bg-brand-gradient opacity-20 blur-3xl" />
      <div className="absolute -right-8 -top-8 -z-10 h-40 w-40 animate-float-slow rounded-full bg-violet-400/30 blur-2xl" />
      <div className="absolute -bottom-10 -left-6 -z-10 h-44 w-44 animate-float rounded-full bg-brand-400/30 blur-2xl" />

      {/* Fenêtre navigateur */}
      <div className="overflow-hidden rounded-[1.6rem] border border-white/70 bg-white shadow-glow ring-1 ring-black/5">
        {/* Barre du navigateur */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-rose-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
          <div className="ml-3 flex-1 rounded-md bg-white py-1.5 text-center text-[11px] font-medium text-ink-muted ring-1 ring-slate-200">
            app.pratonna.fr/tableau-de-bord
          </div>
        </div>

        {/* Corps de l'app */}
        <div className="flex">
          {/* Barre latérale */}
          <div className="flex w-14 flex-col items-center gap-1 border-r border-slate-100 bg-white py-4">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-sm font-extrabold text-white">
              P
            </span>
            <div className="mt-2 flex flex-col gap-1">
              {navIcons.map((Icon, i) => (
                <span
                  key={i}
                  className={`grid h-9 w-9 place-items-center rounded-xl ${
                    i === 0 ? 'bg-brand-50 text-brand-600' : 'text-ink-muted'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                </span>
              ))}
            </div>
          </div>

          {/* Contenu principal */}
          <div className="flex-1 bg-cloud p-4">
            {/* En-tête */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-[15px] font-extrabold text-ink">Tableau de bord</p>
                <p className="text-[11px] text-ink-muted">Bonjour Martin 👋</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Assistant actif
                </span>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-ink-muted ring-1 ring-slate-200">
                  <Bell className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>

            {/* Cartes statistiques */}
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl bg-white p-3 shadow-card">
                  <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-bold ${s.tint}`}>
                    {s.label}
                  </span>
                  <p className="mt-1.5 font-display text-2xl font-extrabold text-ink">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Graphique d'activité */}
            <div className="mt-3 rounded-xl bg-white p-3.5 shadow-card">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-bold text-ink">Activité de l'équipe</p>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                  <TrendingUp className="h-3 w-3" /> +18%
                </span>
              </div>
              <div className="mt-3 flex h-20 items-end gap-2">
                {bars.map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 0.6 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
                    className={`flex-1 rounded-t-md ${
                      i === 5 ? 'bg-brand-gradient' : 'bg-brand-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Suggestion de l'assistant */}
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-brand-100 bg-white p-3 shadow-card">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-gradient text-white">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-[11px] font-bold text-ink">Suggestion de l'assistant</p>
                <p className="text-[11px] leading-snug text-ink-soft">
                  3 clients à relancer aujourd'hui — préparer le devis #2208.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
