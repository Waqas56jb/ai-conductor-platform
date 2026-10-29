import { useLanguage } from '../../context/LanguageContext'
import Icon from './icons'
import { Reveal } from './Reveal'
import SectionHead from './SectionHead'
import './carousel.css'
import './integrations.css'

// Only what works today is marked available; the rest says "coming soon".
export default function Integrations() {
  const { t } = useLanguage()
  const s = t.landing.integrations

  return (
    <section id="integrations" className="lp-section lp-integrations" aria-labelledby="lp-integrations-title">
      <div className="lp-container">
        <SectionHead id="lp-integrations-title" eyebrow={s.eyebrow} title={s.title} sub={s.sub} />
        <ul className="lp-integrations__strip">
          {s.items.map((item, i) => (
            <Reveal as="li" key={item.name} delay={i * 60} className={`lp-integration is-${item.status}`}>
              <Icon name={item.icon} />
              <span className="lp-integration__text">
                <strong>{item.name}</strong>
                <small>{item.detail}</small>
              </span>
              <span className={`lp-chip lp-chip--${item.status}`}>{t.landing.status[item.status]}</span>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
