import { ShieldCheck, Lock, Server, UserCog } from 'lucide-react'
import Reveal from './ui/Reveal'

const items = [
  { icon: ShieldCheck, t: 'Conformité RGPD', d: 'Données hébergées en Europe, droit à l’oubli et registre des traitements.' },
  { icon: Lock, t: 'Chiffrement de bout en bout', d: 'Vos documents et communications sont chiffrés au repos et en transit.' },
  { icon: Server, t: 'Isolation des données', d: 'Chaque entreprise dispose d’un espace cloisonné et sécurisé.' },
  { icon: UserCog, t: 'Contrôle d’accès par rôle', d: 'Admin, manager, collaborateur — chacun voit uniquement ce qui le concerne.' },
]

export default function Security() {
  return (
    <section className="section relative overflow-hidden bg-ink">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.07]" />
      <div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="container-x relative">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <span className="chip !border-white/20 !bg-white/10 !text-brand-100">
              <ShieldCheck className="h-4 w-4" />
              Sécurité & conformité
            </span>
            <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-white sm:text-[2.6rem]">
              Vos données, <span className="text-brand-300">protégées par conception</span>
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              La sécurité n'est pas une option. Pratonna applique les meilleurs standards de
              protection, de confidentialité et de conformité réglementaire dès le premier jour.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {['RGPD', 'Hébergement UE', 'Sauvegardes', 'SSO à venir'].map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200"
                >
                  {b}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((it) => (
                <div
                  key={it.t}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur transition-colors hover:border-brand-400/40 hover:bg-white/[0.07]"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient text-white">
                    <it.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-display text-base font-bold text-white">{it.t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{it.d}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
