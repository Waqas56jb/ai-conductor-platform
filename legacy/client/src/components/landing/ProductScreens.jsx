import { useLanguage } from '../../context/LanguageContext'
import CarouselControls from './CarouselControls'
import Icon from './icons'
import { Reveal } from './Reveal'
import SectionHead from './SectionHead'
import { useCarousel } from './useCarousel'
import './carousel.css'
import './screens.css'

// Real screenshots of the app (seeded demo data), taken at 1440 × 900.
export default function ProductScreens() {
  const { t } = useLanguage()
  const s = t.landing.screens
  const carousel = useCarousel(s.items.length)

  return (
    <section id="interface" className="lp-section lp-screens" aria-labelledby="lp-screens-title">
      <div className="lp-container">
        <SectionHead id="lp-screens-title" eyebrow={s.eyebrow} title={s.title} sub={s.sub} />

        <Reveal className="lp-carousel" role="region" aria-roledescription="carousel" aria-label={s.title}>
          <ul
            {...carousel.trackProps}
            className={`lp-carousel__track lp-screens__track${carousel.dragging ? ' is-dragging' : ''}`}
          >
            {s.items.map((item, i) => (
              <li key={item.src} aria-roledescription="slide" aria-label={`${i + 1} / ${s.items.length}`}>
                <figure className="lp-device">
                  <div className="lp-device__chrome" aria-hidden="true">
                    <span className="lp-device__dots">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="lp-device__url">pratonna-app.vercel.app</span>
                  </div>
                  <img
                    src={item.src}
                    alt={item.title}
                    width="1440"
                    height="900"
                    loading={i === 0 ? 'eager' : 'lazy'}
                    draggable="false"
                  />
                  <figcaption>
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
          <CarouselControls count={s.items.length} labels={s} {...carousel} />
        </Reveal>

        <Reveal className="lp-screens__cta">
          <a href="#demo" className="ai-btn ai-btn--primary">
            {s.cta}
            <Icon name="arrow" />
          </a>
        </Reveal>
      </div>
    </section>
  )
}
