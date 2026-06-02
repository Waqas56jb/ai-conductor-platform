import { motion } from 'framer-motion'
import {
  Sparkles,
  PlayCircle,
  ArrowRight,
  CheckCircle2,
  Bell,
  ListTodo,
  Mail,
  ShieldCheck,
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
    <section id="top" className="relative overflow-hidden bg-hero-radial pt-28 sm:pt-36">
      {/* Décors d'arrière-plan */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.55]" />
      <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="container-x relative">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
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
              className="mt-6 font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-[4.2rem]"
            >
              Votre <span className="gradient-text">6ème collaborateur</span>,
              <br className="hidden sm:block" /> 100% IA.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              initial="hidden"
              animate="show"
              className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-soft lg:mx-0"
            >
              Optimisez, pilotez, déléguez avec un agent intelligent. Pratonna centralise
              votre CRM, vos tâches, vos e-mails et vos équipes — puis{' '}
              <strong className="text-ink">organise et priorise le travail à votre place.</strong>
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              initial="hidden"
              animate="show"
              className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
            >
              <a href="#demonstration" className="btn-primary w-full sm:w-auto">
                Demander une démo
                <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#tarifs" className="btn-ghost w-full sm:w-auto">
                <PlayCircle className="h-5 w-5 text-brand-600" />
                Voir les tarifs
              </a>
            </motion.div>

            <motion.ul
              variants={fadeUp}
              custom={4}
              initial="hidden"
              animate="show"
              className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-muted lg:justify-start"
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
      <div className="relative mt-16 sm:mt-24">
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

function HeroVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      className="relative mx-auto w-full max-w-[560px]"
    >
      {/* Halo */}
      <div className="absolute inset-0 -z-10 rounded-[2rem] bg-brand-gradient opacity-20 blur-3xl" />

      {/* Image principale — agent IA */}
      <div className="relative overflow-hidden rounded-[1.8rem] border border-white/70 shadow-glow">
        <img
          src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=1100&q=80"
          alt="Collaboratrice pilotant Pratonna"
          loading="eager"
          className="h-[440px] w-full object-cover sm:h-[520px]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950/55 via-transparent to-transparent" />

        {/* En-tête flottant de l'app */}
        <div className="absolute left-4 right-4 top-4 flex items-center justify-between rounded-2xl border border-white/30 bg-white/15 px-4 py-2.5 backdrop-blur-md">
          <div className="flex items-center gap-2 text-white">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/20 text-xs font-bold">
              P
            </span>
            <span className="text-sm font-semibold">Tableau de bord</span>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/90 px-2.5 py-1 text-[11px] font-bold text-emerald-950">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-900" />
            Agent actif
          </span>
        </div>
      </div>

      {/* Carte flottante — Suggestion IA */}
      <motion.div
        className="absolute -left-4 top-28 w-60 animate-float sm:-left-10"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7, duration: 0.6 }}
      >
        <div className="card-glass p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <p className="text-sm font-bold text-ink">Suggestion de l'agent</p>
          </div>
          <p className="mt-2 text-[13px] leading-snug text-ink-soft">
            « Relancer 3 clients inactifs et préparer le devis #2208. »
          </p>
          <div className="mt-3 flex gap-2">
            <button className="flex-1 rounded-lg bg-brand-gradient py-1.5 text-xs font-semibold text-white">
              Valider
            </button>
            <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-ink-soft">
              Plus tard
            </button>
          </div>
        </div>
      </motion.div>

      {/* Carte flottante — Tâches du jour */}
      <motion.div
        className="absolute -right-3 bottom-24 w-56 animate-float-slow sm:-right-8"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.9, duration: 0.6 }}
      >
        <div className="card-glass p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-ink">Aujourd'hui</p>
            <ListTodo className="h-4 w-4 text-brand-500" />
          </div>
          <ul className="mt-3 space-y-2">
            {[
              { t: 'Visite chantier — Lyon', d: true },
              { t: 'Email équipe BTP', d: true },
              { t: 'Facture #2208', d: false },
            ].map((row) => (
              <li key={row.t} className="flex items-center gap-2 text-[13px]">
                <CheckCircle2
                  className={`h-4 w-4 ${row.d ? 'text-emerald-500' : 'text-slate-300'}`}
                />
                <span className={row.d ? 'text-ink-muted line-through' : 'text-ink-soft'}>
                  {row.t}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* Petites pastilles de notifications */}
      <motion.div
        className="absolute -right-2 top-10 flex gap-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.05, duration: 0.5 }}
      >
        {[Bell, Mail, ShieldCheck].map((Icon, i) => (
          <span
            key={i}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/70 bg-white/90 text-brand-600 shadow-card backdrop-blur"
          >
            <Icon className="h-4 w-4" />
          </span>
        ))}
      </motion.div>
    </motion.div>
  )
}
