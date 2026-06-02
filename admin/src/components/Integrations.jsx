import { Mail, MessageCircle, Calendar, CreditCard, FileSignature, HardDrive, Plug } from 'lucide-react'
import Reveal from './ui/Reveal'

const integrations = [
  { icon: Mail, name: 'Gmail', sub: 'Boîte de réception unifiée' },
  { icon: MessageCircle, name: 'WhatsApp', sub: 'API Meta Business' },
  { icon: Calendar, name: 'Google Agenda', sub: 'Synchronisation temps réel' },
  { icon: CreditCard, name: 'Stripe', sub: 'Paiements & abonnements' },
  { icon: FileSignature, name: 'Signatures', sub: 'Contrats électroniques' },
  { icon: HardDrive, name: 'Stockage S3', sub: 'Documents & médias' },
]

export default function Integrations() {
  return (
    <section id="integrations" className="section relative overflow-hidden bg-cloud">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" />
      <div className="container-x relative">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <p className="eyebrow">Intégrations</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-[2.6rem]">
              Connecté à vos <span className="gradient-text">outils du quotidien</span>
            </h2>
            <p className="mt-4 text-lg text-ink-soft">
              Pratonna s'intègre à vos applications existantes pour transformer chaque message,
              e-mail ou événement en action exploitable — sans changer vos habitudes.
            </p>
            <a href="#demonstration" className="btn-primary mt-7">
              <Plug className="h-4 w-4" />
              Connecter mes outils
            </a>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {integrations.map((it) => (
                <div
                  key={it.name}
                  className="group flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-glow"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-gradient group-hover:text-white">
                    <it.icon className="h-6 w-6" />
                  </span>
                  <p className="mt-3 text-sm font-bold text-ink">{it.name}</p>
                  <p className="mt-0.5 text-[11.5px] leading-tight text-ink-muted">{it.sub}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
