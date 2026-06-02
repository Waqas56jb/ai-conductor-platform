import { ArrowRight, CalendarCheck } from 'lucide-react'
import Reveal from './ui/Reveal'

export default function CTA() {
  return (
    <section id="demonstration" className="section bg-white">
      <div className="container-x">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-brand-gradient px-7 py-14 text-center shadow-glow sm:px-12 sm:py-20">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-15" />
            <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-violet-300/25 blur-3xl" />

            <div className="relative mx-auto max-w-2xl">
              <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
                Prêt à rencontrer votre 6ème collaborateur ?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-brand-50">
                Rejoignez les entreprises qui délèguent l'organisation à l'IA. Demandez une démo
                personnalisée — sans engagement.
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a
                  href="#connexion"
                  className="btn w-full bg-white text-brand-700 hover:-translate-y-0.5 hover:shadow-glow sm:w-auto"
                >
                  <CalendarCheck className="h-5 w-5" />
                  Demander une démo
                </a>
                <a
                  href="#tarifs"
                  className="btn w-full border border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20 sm:w-auto"
                >
                  Voir les tarifs
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              <p className="mt-6 text-sm text-brand-100">
                Aucune carte bancaire requise · Mise en route en 5 minutes
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
