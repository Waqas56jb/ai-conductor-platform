import { useLanguage } from '../../context/LanguageContext'
import Icon from './icons'
import { Reveal } from './Reveal'
import SectionHead from './SectionHead'
import './industries.css'

const ICONS = ['home', 'building', 'crane', 'wrench']

export default function Industries() {
  const { t } = useLanguage()
  const s = t.landing.industries

  return (
    <section id="solutions" className="lp-section lp-industries" aria-labelledby="lp-industries-title">
      <div className="lp-container">
        <SectionHead id="lp-industries-title" eyebrow={s.eyebrow} title={s.title} sub={s.sub} />

        <ul className="lp-industries__grid">
          {s.items.map((item, i) => (
            <Reveal as="li" key={item.title} delay={i * 90}>
              <article className="lp-card lp-industry">
                <div className="lp-industry__top">
                  <span className="lp-icon-tile">
                    <Icon name={ICONS[i]} />
                  </span>
                  <h3>{item.title}</h3>
                </div>
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
