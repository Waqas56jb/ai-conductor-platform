import { useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import Icon from './icons'
import { Reveal } from './Reveal'
import SectionHead from './SectionHead'
import './faq.css'

export default function Faq() {
  const { t } = useLanguage()
  const s = t.landing.faq
  const [open, setOpen] = useState(() => new Set())

  function toggle(i) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <section id="faq" className="lp-section lp-faq" aria-labelledby="lp-faq-title">
      <div className="lp-container lp-faq__inner">
        <SectionHead id="lp-faq-title" eyebrow={s.eyebrow} title={s.title} />

        <Reveal className="lp-faq__list">
          {s.items.map((item, i) => {
            const isOpen = open.has(i)
            return (
              <div className={`lp-faq__item${isOpen ? ' is-open' : ''}`} key={item.q}>
                <h3>
                  <button
                    type="button"
                    id={`lp-faq-q-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`lp-faq-a-${i}`}
                    onClick={() => toggle(i)}
                  >
                    {item.q}
                    <span className="lp-faq__chevron">
                      <Icon name="chevron" />
                    </span>
                  </button>
                </h3>
                <div
                  className="lp-faq__answer"
                  id={`lp-faq-a-${i}`}
                  role="region"
                  aria-labelledby={`lp-faq-q-${i}`}
                  inert={!isOpen}
                >
                  <div>
                    <p>{item.a}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </Reveal>
      </div>
    </section>
  )
}
