import { useEffect } from 'react'
import '../components/landing/landing.css'
import DemoContact from '../components/landing/DemoContact'
import DemoCta from '../components/landing/DemoCta'
import DemoVideo from '../components/landing/DemoVideo'
import FeatureParts from '../components/landing/FeatureParts'
import FinalCta from '../components/landing/FinalCta'
import Footer from '../components/landing/Footer'
import Header from '../components/landing/Header'
import Icon from '../components/landing/icons'
import Pilot from '../components/landing/Pilot'
import ProductScreens from '../components/landing/ProductScreens'
import { Reveal } from '../components/landing/Reveal'
import SectionHead from '../components/landing/SectionHead'
import { useLanguage } from '../context/LanguageContext'
import { useMeta } from '../seo'
import './sector-page.css'

/** Dedicated page of one trade: /immobilier or /btp. */
export default function SectorPage({ page }) {
  const { t } = useLanguage()
  const s = t.landing.pages[page]
  const free = t.landing.demo.free
  // Real estate shares its two parts with the home page's "Immobilier" tab.
  const parts = s.parts ?? t.landing.realEstate.parts
  useMeta({ ...s.meta, path: `/${page}` })

  useEffect(() => {
    document.body.classList.add('lp-body')
    return () => document.body.classList.remove('lp-body')
  }, [])

  return (
    <div className="lp">
      <Header />
      <main>
        <section className="lp-sector-hero" aria-labelledby="lp-sector-title">
          <div className="lp-container">
            <Reveal>
              <p className="lp-eyebrow">{s.eyebrow}</p>
              <h1 className="lp-sector-hero__title" id="lp-sector-title">
                {s.title}
              </h1>
              <p className="lp-sub">{s.sub}</p>
              <div className="lp-sector-hero__ctas">
                <DemoCta placement={`${page}-hero`}>
                  {t.landing.nav.freeDemoLong}
                  <Icon name="arrow" />
                </DemoCta>
                {s.video ? (
                  <a href="#video" className="ai-btn ai-btn--ghost">
                    {t.hero.ctaWatch}
                  </a>
                ) : null}
              </div>
              <p className="lp-free lp-sector-hero__free">
                <Icon name="check" />
                {free}
              </p>
            </Reveal>
          </div>
        </section>

        {s.video ? (
          <section id="video" className="lp-section lp-sector-video" aria-labelledby="lp-video-title">
            <div className="lp-container">
              <SectionHead id="lp-video-title" eyebrow={t.landing.video.eyebrow} title={t.landing.video.title} sub={t.landing.video.sub} />
              <DemoVideo placement={page} />
            </div>
          </section>
        ) : null}

        <section id="fonctionnalites" className="lp-section" aria-labelledby="lp-parts-title">
          <div className="lp-container">
            <SectionHead id="lp-parts-title" eyebrow={s.partsEyebrow} title={s.partsTitle} sub={s.partsSub} />
            <FeatureParts parts={parts} />
          </div>
        </section>

        <section className="lp-section lp-benefits" aria-labelledby="lp-benefits-title">
          <div className="lp-container">
            <SectionHead id="lp-benefits-title" title={s.benefitsTitle} />
            <ul className="lp-benefits__list">
              {s.benefits.map((b, i) => (
                <Reveal as="li" key={b.title} delay={i * 80} className="lp-card">
                  <span className="lp-icon-tile">
                    <Icon name={b.icon} />
                  </span>
                  <h3>{b.title}</h3>
                  <p>{b.text}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {s.video ? null : <ProductScreens />}
        <Pilot />
        <DemoContact defaultSector={s.sector} />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
