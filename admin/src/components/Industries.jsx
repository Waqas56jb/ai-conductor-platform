import { Building2, HardHat, Wrench, ArrowUpRight } from 'lucide-react'
import Reveal from './ui/Reveal'

const industries = [
  {
    icon: Building2,
    tag: 'Immobilier',
    title: 'Agences & gestion locative',
    desc: 'Suivi des biens, relances locataires, dossiers clients et signatures électroniques — orchestrés par l’IA.',
    img: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=900&q=80',
    points: ['Pipeline de mandats', 'Relances automatiques', 'Dossiers locataires'],
  },
  {
    icon: HardHat,
    tag: 'BTP & Construction',
    title: 'Chantiers & interventions',
    desc: 'Déclaration terrain par photo, devis automatiques, validation hiérarchique et planification d’équipe.',
    img: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80',
    points: ['Rapports de chantier', 'Devis générés par IA', 'Suivi des interventions'],
  },
  {
    icon: Wrench,
    tag: 'Services & PME',
    title: 'Entreprises de services',
    desc: 'Centralisez clients, planning, facturation et communication. L’agent priorise le travail de chaque équipe.',
    img: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80',
    points: ['Planning intelligent', 'Facturation', 'Support client'],
  },
]

export default function Industries() {
  return (
    <section className="section bg-white">
      <div className="container-x">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Solutions métiers</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-[2.6rem]">
            Pensé pour <span className="gradient-text">votre secteur</span>
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            Des modèles prêts à l'emploi qui s'adaptent à vos processus — et non l'inverse.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {industries.map((ind, i) => (
            <Reveal key={ind.tag} delay={i * 0.1}>
              <article className="group h-full overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-glow">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={ind.img}
                    alt={ind.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-950/70 to-transparent" />
                  <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-brand-700 backdrop-blur">
                    <ind.icon className="h-4 w-4" />
                    {ind.tag}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-xl font-bold text-ink">{ind.title}</h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{ind.desc}</p>
                  <ul className="mt-4 space-y-1.5">
                    {ind.points.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-sm text-ink-soft">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-gradient" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#demonstration"
                    className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 transition-colors hover:text-violet-600"
                  >
                    Découvrir le modèle
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
