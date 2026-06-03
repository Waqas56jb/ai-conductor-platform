import { Camera, ScanText, CheckCheck, Send } from 'lucide-react'
import Reveal from './ui/Reveal'

const steps = [
  {
    n: '01',
    icon: Camera,
    title: 'Capturez',
    desc: 'Un collaborateur prend une photo ou une vidéo sur le terrain — une fuite, un dégât, un document — et l’envoie en un clic.',
  },
  {
    n: '02',
    icon: ScanText,
    title: 'L’IA analyse',
    desc: 'L’assistant comprend la situation, rédige un compte-rendu professionnel et propose un devis chiffré automatiquement.',
  },
  {
    n: '03',
    icon: CheckCheck,
    title: 'Validez',
    desc: 'La demande remonte au bon responsable pour approbation. Un clic suffit pour valider ou ajuster l’action proposée.',
  },
  {
    n: '04',
    icon: Send,
    title: 'L’action part seule',
    desc: 'Tâche assignée au bon employé, notifications envoyées, relances planifiées. Personne n’a rien oublié.',
  },
]

export default function HowItWorks() {
  return (
    <section id="solutions" className="section relative overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 bg-mesh opacity-70" />
      <div className="container-x relative">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">L'orchestration en action</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-[2.6rem]">
            L'utilisateur ne se demande plus{' '}
            <span className="gradient-text">« quoi faire »</span>
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            Pratonna structure le travail en permanence et enchaîne les étapes à votre place.
            De la déclaration à l'action finale — automatiquement.
          </p>
        </Reveal>

        <div className="relative mt-16">
          {/* Ligne de connexion (desktop) */}
          <div className="absolute left-0 right-0 top-[42px] hidden h-0.5 bg-gradient-to-r from-brand-200 via-violet-300 to-brand-200 lg:block" />

          <div className="grid gap-8 lg:grid-cols-4 lg:gap-6">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.12}>
                <div className="relative text-center lg:text-left">
                  <div className="mx-auto flex h-[84px] w-[84px] items-center justify-center rounded-2xl border border-brand-100 bg-white shadow-glow lg:mx-0">
                    <s.icon className="h-9 w-9 text-brand-600" />
                    <span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-brand-gradient text-xs font-bold text-white shadow-glow">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-6 font-display text-xl font-bold text-ink">{s.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Bandeau de résultat */}
        <Reveal delay={0.2}>
          <div className="mt-16 overflow-hidden rounded-3xl bg-brand-gradient p-px shadow-glow">
            <div className="grid items-center gap-6 rounded-[1.45rem] bg-white px-7 py-8 sm:grid-cols-3 sm:px-10">
              {[
                { k: '−70%', v: 'de tâches manuelles répétitives' },
                { k: '0', v: 'oubli ou perte d’information' },
                { k: '24/7', v: 'un assistant toujours actif' },
              ].map((b) => (
                <div key={b.v} className="text-center sm:text-left">
                  <p className="font-display text-4xl font-extrabold gradient-text">{b.k}</p>
                  <p className="mt-1 text-sm font-medium text-ink-soft">{b.v}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
