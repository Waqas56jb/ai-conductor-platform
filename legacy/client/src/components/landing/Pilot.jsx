import { useLanguage } from '../../context/LanguageContext'
import Icon from './icons'
import { Reveal } from './Reveal'
import './pilot.css'

// Takes the place of testimonials until real ones exist.
export default function Pilot() {
  const { t } = useLanguage()
  const s = t.landing.pilot

  return (
    <section id="programme-pilote" className="lp-section lp-pilot" aria-labelledby="lp-pilot-title">
      <div className="lp-container">
        <Reveal className="lp-card lp-gborder lp-pilot__card">
          <img className="lp-pilot__avatar" src="/avatar-head.webp" alt="" width="96" height="96" loading="lazy" />
          <div className="lp-pilot__copy">
            <p className="lp-eyebrow">{s.eyebrow}</p>
            <h2 className="lp-title" id="lp-pilot-title">
              {s.title}
            </h2>
            <p className="lp-sub">{s.sub}</p>
            <ul className="lp-checklist">
              {s.points.map((point) => (
                <li key={point}>
                  <Icon name="check" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <a href="#demo" className="ai-btn ai-btn--primary lp-pilot__cta">
            {s.cta}
            <Icon name="arrow" />
          </a>
        </Reveal>
      </div>
    </section>
  )
}
