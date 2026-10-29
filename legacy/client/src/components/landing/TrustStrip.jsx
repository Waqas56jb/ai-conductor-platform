import { useLanguage } from '../../context/LanguageContext'
import Icon from './icons'
import { Reveal } from './Reveal'
import './trust-strip.css'

const ICONS = ['home', 'building', 'landmark', 'crane', 'wrench', 'briefcase']

export default function TrustStrip() {
  const { t } = useLanguage()
  const s = t.landing.trust

  return (
    <section className="lp-trust" aria-labelledby="lp-trust-title">
      <div className="lp-container">
        <Reveal as="p" className="lp-trust__title" id="lp-trust-title">
          {s.title}
        </Reveal>
        <ul className="lp-trust__list">
          {s.items.map((item, i) => (
            <Reveal as="li" key={item} delay={i * 60}>
              <Icon name={ICONS[i]} />
              {item}
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
