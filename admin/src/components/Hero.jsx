import { motion } from 'framer-motion'
import { Sparkles, PlayCircle, ArrowRight, CheckCircle2 } from 'lucide-react'

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
              className="mt-5 font-display text-[2.2rem] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-[3.5rem]"
            >
              Votre <span className="gradient-text">6ème collaborateur</span>,
              <br className="hidden sm:block" /> 100% IA.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              initial="hidden"
              animate="show"
              className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-ink-soft sm:text-base lg:mx-0"
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
              className="mt-7 flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
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
              className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-muted lg:justify-start"
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

function HeroVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      className="relative mx-auto w-full max-w-[580px]"
    >
      {/* Halos décoratifs */}
      <div className="absolute -inset-6 -z-10 rounded-[2.4rem] bg-brand-gradient opacity-20 blur-3xl" />
      <div className="absolute -right-8 -top-8 -z-10 h-40 w-40 animate-float-slow rounded-full bg-violet-400/30 blur-2xl" />
      <div className="absolute -bottom-10 -left-6 -z-10 h-44 w-44 animate-float rounded-full bg-brand-400/30 blur-2xl" />

      {/* Cadre premium en dégradé */}
      <div className="rounded-[2rem] bg-gradient-to-br from-white/80 via-brand-100/50 to-violet-100/50 p-2 shadow-glow backdrop-blur-sm">
        <div className="relative overflow-hidden rounded-[1.6rem] ring-1 ring-white/60">
          <img
            src="https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80"
            alt="Équipe pilotant l'automatisation avec Pratonna"
            loading="eager"
            className="h-[300px] w-full object-cover sm:h-[380px] lg:h-[440px]"
          />
          {/* Voile dégradé subtil pour la profondeur */}
          <div className="absolute inset-0 bg-gradient-to-tr from-brand-950/30 via-transparent to-violet-500/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-950/25 to-transparent" />
        </div>
      </div>

      {/* Reflet lumineux décoratif */}
      <div className="pointer-events-none absolute inset-x-10 top-3 h-16 rounded-full bg-white/30 blur-2xl" />
    </motion.div>
  )
}
