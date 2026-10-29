import { useLanguage } from '../../context/LanguageContext'
import Icon from './icons'
import { Reveal } from './Reveal'
import SectionHead from './SectionHead'
import './testimonials.css'

// Placeholders only: no real testimonials yet, so no names or companies.
export default function Testimonials() {
  const { t } = useLanguage()
  const s = t.landing.testimonials

  return (
    <section className="lp-section lp-testimonials" aria-labelledby="lp-testimonials-title">
      <div className="lp-container">
        <SectionHead id="lp-testimonials-title" eyebrow={s.eyebrow} title={s.title} />

        <Reveal as="p" className="lp-testimonials__badge">
          <Icon name="clock" />
          {s.badge}
        </Reveal>

        <ul className="lp-testimonials__grid">
          {s.items.map((item, i) => (
            <Reveal as="li" key={item.initials} delay={i * 100}>
              <figure className="lp-card lp-quote">
                <span className="lp-quote__mark" aria-hidden="true">
                  “
                </span>
                <blockquote>{s.placeholder}</blockquote>
                <figcaption>
                  <span className="lp-quote__avatar" aria-hidden="true">
                    {item.initials}
                  </span>
                  <span className="lp-quote__sector">{item.sector}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </ul>

        <Reveal className="lp-testimonials__cta">
          <a href="#demo" className="ai-btn ai-btn--ghost">
            {s.cta}
            <Icon name="arrow" />
          </a>
        </Reveal>
      </div>
    </section>
  )
}
