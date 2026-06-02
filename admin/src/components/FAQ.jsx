import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Minus } from 'lucide-react'
import Reveal from './ui/Reveal'

const faqs = [
  {
    q: "En quoi Pratonna est-il différent d'un simple assistant IA ?",
    a: "Pratonna n'est pas un chatbot qui répond. C'est un agent qui orchestre : il organise le travail, priorise les tâches et propose des actions concrètes à valider. Il agit comme un véritable membre de l'équipe.",
  },
  {
    q: 'Mes données sont-elles sécurisées et conformes au RGPD ?',
    a: "Oui. Les données sont hébergées en Europe, chiffrées au repos et en transit. Chaque entreprise dispose d'un espace totalement isolé, avec un contrôle d'accès par rôle.",
  },
  {
    q: 'Puis-je connecter mes outils existants ?',
    a: "Absolument. Gmail, WhatsApp (API Meta Business), Google Agenda, Stripe et le stockage de documents sont intégrés. D'autres connecteurs arrivent régulièrement.",
  },
  {
    q: 'Pratonna convient-il à mon secteur ?',
    a: "Des modèles métiers prêts à l'emploi existent pour l'immobilier, le BTP et les entreprises de services. L'agent s'adapte ensuite à vos processus spécifiques.",
  },
  {
    q: 'Combien de temps pour démarrer ?',
    a: "La mise en route prend quelques minutes : créez votre compte, configurez votre entreprise et invitez vos collaborateurs. L'agent est opérationnel immédiatement.",
  },
  {
    q: 'Puis-je gérer plusieurs entreprises ?',
    a: "Oui. L'architecture multi-entreprises de l'offre Entreprise permet de centraliser plusieurs sociétés tout en gardant leurs données strictement séparées.",
  },
]

function Item({ q, a, open, onToggle }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white transition-colors hover:border-brand-200">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="font-display text-[16px] font-bold text-ink">{q}</span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
          {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-5 text-[15px] leading-relaxed text-ink-soft">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQ() {
  const [open, setOpen] = useState(0)
  return (
    <section id="faq" className="section bg-white">
      <div className="container-x">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Questions fréquentes</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-[2.6rem]">
            Tout ce que vous devez <span className="gradient-text">savoir</span>
          </h2>
        </Reveal>

        <div className="mx-auto mt-12 max-w-3xl space-y-3">
          {faqs.map((f, i) => (
            <Reveal key={f.q} delay={i * 0.05}>
              <Item {...f} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
