import { Star, Quote } from 'lucide-react'
import Reveal from './ui/Reveal'

const testimonials = [
  {
    quote:
      "Pratonna a remplacé trois outils différents. L'agent prépare nos relances et nos devis : on gagne une journée entière par semaine.",
    name: 'Camille Laurent',
    role: 'Directrice, Agence Immo Prestige',
    img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80',
  },
  {
    quote:
      "Sur le terrain, mes équipes prennent une photo et le rapport est prêt. La validation se fait en un clic. Un vrai 6ème collaborateur.",
    name: 'Mehdi Benali',
    role: 'Gérant, Terra BTP',
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
  },
  {
    quote:
      "L'interface est claire, rapide et magnifique. Mes collaborateurs l'ont adoptée en une journée, sans formation.",
    name: 'Sophie Marchand',
    role: 'COO, Volta Services',
    img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=160&q=80',
  },
]

export default function Testimonials() {
  return (
    <section className="section bg-cloud">
      <div className="container-x">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Témoignages</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-[2.6rem]">
            Des équipes qui <span className="gradient-text">avancent plus vite</span>
          </h2>
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
            ))}
            <span className="ml-2 text-sm font-semibold text-ink-soft">4,9/5 · 120+ avis</span>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.1}>
              <figure className="flex h-full flex-col rounded-3xl border border-slate-100 bg-white p-7 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-glow">
                <Quote className="h-8 w-8 text-brand-200" />
                <blockquote className="mt-4 flex-1 text-[15.5px] leading-relaxed text-ink-soft">
                  « {t.quote} »
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
                  <img src={t.img} alt={t.name} className="h-11 w-11 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-bold text-ink">{t.name}</p>
                    <p className="text-[13px] text-ink-muted">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
