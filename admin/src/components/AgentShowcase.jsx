import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sliders, MessagesSquare, Target, Gauge, CheckCircle2 } from 'lucide-react'
import Reveal from './ui/Reveal'

const styles = ['Directif & Pragmatique', 'Coach & Rassurant']
const priorities = ['Gestion', 'Comptabilité', 'Ressources Humaines', 'Prospection']

// Avatars illustrés (initiales) — aucune photo réelle, zéro risque juridique
const avatars = [
  { initials: 'PA', gradient: 'from-brand-500 to-violet-600' },
  { initials: 'NX', gradient: 'from-violet-500 to-brand-500' },
  { initials: 'AL', gradient: 'from-brand-600 to-brand-400' },
]

export default function AgentShowcase() {
  const [style, setStyle] = useState(0)
  const [profile, setProfile] = useState(0)
  const [proactivity, setProactivity] = useState(70)
  const [active, setActive] = useState(['Gestion', 'Prospection'])

  const toggle = (p) =>
    setActive((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]))

  return (
    <section className="section bg-cloud">
      <div className="container-x">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Texte */}
          <Reveal>
            <p className="eyebrow">Un assistant à votre image</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-[2.6rem]">
              Programmez votre <span className="gradient-text">Pratonna</span>
            </h2>
            <p className="mt-4 text-lg text-ink-soft">
              Personnalisez votre assistant intelligent pour qu'il s'adapte parfaitement à vos
              besoins et à votre style de travail. Choisissez son profil, son ton, son niveau
              de proactivité et ses priorités métier.
            </p>

            <ul className="mt-7 space-y-4">
              {[
                { icon: MessagesSquare, t: 'Style de communication', d: 'Directif ou coach — l’assistant parle votre langage.' },
                { icon: Gauge, t: 'Niveau de proactivité', d: 'De discret à force de proposition permanente.' },
                { icon: Target, t: 'Priorités métier', d: 'Gestion, comptabilité, RH, prospection… vous décidez.' },
              ].map((row) => (
                <li key={row.t} className="flex gap-3">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white">
                    <row.icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="font-bold text-ink">{row.t}</p>
                    <p className="text-sm text-ink-soft">{row.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* Panneau de configuration interactif */}
          <Reveal delay={0.15}>
            <div className="rounded-3xl border border-white/70 bg-white p-6 shadow-glow sm:p-8">
              <div className="mb-6 flex items-center gap-2">
                <Sliders className="h-5 w-5 text-brand-600" />
                <h3 className="font-display text-lg font-bold text-ink">Configuration de l'assistant</h3>
              </div>

              {/* Avatars illustrés (initiales) */}
              <p className="text-sm font-semibold text-ink">Profil</p>
              <div className="mt-3 flex gap-3">
                {avatars.map((a, i) => (
                  <button
                    key={a.initials}
                    onClick={() => setProfile(i)}
                    aria-label={`Choisir le profil ${a.initials}`}
                    className={`grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br ${a.gradient} font-display text-base font-bold text-white ring-2 ring-offset-2 transition ${
                      profile === i ? 'ring-brand-500' : 'ring-transparent hover:ring-brand-200'
                    }`}
                  >
                    {a.initials}
                  </button>
                ))}
              </div>

              {/* Style de communication */}
              <p className="mt-6 text-sm font-semibold text-ink">Style de communication</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {styles.map((s, i) => (
                  <button
                    key={s}
                    onClick={() => setStyle(i)}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      style === i
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 text-ink-soft hover:border-brand-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Proactivité */}
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">Niveau de proactivité</p>
                <span className="text-sm font-bold text-brand-600">{proactivity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={proactivity}
                onChange={(e) => setProactivity(+e.target.value)}
                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-brand-100 accent-brand-600"
              />

              {/* Priorités */}
              <p className="mt-6 text-sm font-semibold text-ink">Priorités de l'assistant</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {priorities.map((p) => {
                  const on = active.includes(p)
                  return (
                    <button
                      key={p}
                      onClick={() => toggle(p)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${
                        on
                          ? 'border-brand-500 bg-brand-gradient text-white'
                          : 'border-slate-200 text-ink-soft hover:border-brand-300'
                      }`}
                    >
                      {on && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {p}
                    </button>
                  )
                })}
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                className="btn-primary mt-7 w-full"
              >
                Sauvegarder la configuration
              </motion.button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
