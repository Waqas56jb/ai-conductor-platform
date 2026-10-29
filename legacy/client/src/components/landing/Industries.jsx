import { useLanguage } from '../../context/LanguageContext'
import CarouselControls from './CarouselControls'
import Icon from './icons'
import { Reveal } from './Reveal'
import SectionHead from './SectionHead'
import { useCarousel } from './useCarousel'
import './carousel.css'
import './industries.css'

const ICONS = ['home', 'building', 'crane', 'ruler', 'wrench']

export default function Industries() {
  const { t } = useLanguage()
  const s = t.landing.industries
  const carousel = useCarousel(s.items.length)

  return (
    <section id="solutions" className="lp-section lp-industries" aria-labelledby="lp-industries-title">
      <div className="lp-container">
        <SectionHead id="lp-industries-title" eyebrow={s.eyebrow} title={s.title} sub={s.sub} />

        <Reveal className="lp-carousel" role="region" aria-roledescription="carousel" aria-label={s.title}>
          <ul
            {...carousel.trackProps}
            className={`lp-carousel__track lp-industries__track${carousel.dragging ? ' is-dragging' : ''}`}
          >
            {s.items.map((item, i) => (
              <li key={item.title} aria-roledescription="slide" aria-label={`${i + 1} / ${s.items.length}`}>
                <article className="lp-card lp-industry">
                  <div className="lp-industry__top">
                    <span className="lp-icon-tile">
                      <Icon name={ICONS[i]} />
                    </span>
                    <div>
                      <h3>{item.title}</h3>
                      <p className="lp-industry__tag">{item.tag}</p>
                    </div>
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
              </li>
            ))}
          </ul>
          <CarouselControls count={s.items.length} labels={s} {...carousel} />
        </Reveal>
      </div>
    </section>
  )
}
