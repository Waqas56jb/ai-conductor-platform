import { useLanguage } from '../../context/LanguageContext'
import Icon from './icons'
import { Reveal } from './Reveal'
import './carousel.css'
import './feature-parts.css'

/**
 * A trade's features in numbered parts, each line with an honest status chip:
 * "Disponible" ships in the app today, "Bientôt" is planned.
 */
export default function FeatureParts({ parts }) {
  const { t } = useLanguage()
  const status = t.landing.status

  return (
    <div className="lp-parts">
      {parts.map((part, i) => (
        <Reveal key={part.title} delay={i * 100} className="lp-card lp-part">
          <h3>
            <span className="lp-part__num" aria-hidden="true">
              {i + 1}
            </span>
            {part.title}
          </h3>
          <ul>
            {part.items.map((item) => (
              <li key={item.text} className={item.status === 'soon' ? 'is-soon' : ''}>
                <Icon name={item.status === 'soon' ? 'clock' : 'check'} />
                <span>{item.text}</span>
                <span className={`lp-chip lp-chip--${item.status}`}>{status[item.status]}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      ))}
    </div>
  )
}
