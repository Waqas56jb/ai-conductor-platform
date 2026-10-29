import { useLanguage } from '../../context/LanguageContext'
import Icon from './icons'
import { Reveal } from './Reveal'
import SectionHead from './SectionHead'
import './features.css'

const ICONS = ['mic', 'mail', 'file', 'spark', 'folder', 'users', 'chart', 'image']

// Spotlight that follows the cursor across a card.
function onPointerMove(e) {
  const card = e.currentTarget
  const rect = card.getBoundingClientRect()
  card.style.setProperty('--mx', `${e.clientX - rect.left}px`)
  card.style.setProperty('--my', `${e.clientY - rect.top}px`)
}

export default function Features() {
  const { t } = useLanguage()
  const s = t.landing.features

  return (
    <section id="fonctionnalites" className="lp-section lp-features" aria-labelledby="lp-features-title">
      <div className="lp-container">
        <SectionHead id="lp-features-title" eyebrow={s.eyebrow} title={s.title} sub={s.sub} />

        <ul className="lp-features__grid">
          {s.items.map((item, i) => (
            <Reveal as="li" key={item.title} delay={(i % 4) * 80}>
              <article className="lp-card lp-feature" onPointerMove={onPointerMove}>
                <span className="lp-icon-tile">
                  <Icon name={ICONS[i]} />
                </span>
                <h3>{item.title}</h3>
                <ul className="lp-checklist">
                  {item.points.map((point) => (
                    <li key={point}>
                      <Icon name="check" />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
