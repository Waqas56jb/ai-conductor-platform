import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useLanguage } from '../context/LanguageContext'

const HERO_IMG =
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=80'
const WHY_IMG =
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1400&q=80'

export default function Landing() {
  const { t } = useLanguage()
  const year = new Date().getFullYear()

  return (
    <>
      <Navbar />

      <section className="hero">
        <div className="hero-media" aria-hidden="true">
          <img src={HERO_IMG} alt="" />
          <div className="hero-overlay" />
        </div>
        <div className="container hero-content">
          <p className="hero-brand">{t.hero.brand}</p>
          <h1 className="hero-headline">{t.hero.headline}</h1>
          <p className="hero-sub">{t.hero.sub}</p>
          <div className="hero-ctas">
            <Link to="/signup" className="btn btn-primary">
              {t.hero.ctaPrimary}
            </Link>
            <a href="#how" className="btn btn-ghost">
              {t.hero.ctaSecondary}
            </a>
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="container">
          <div className="section-head">
            <h2>{t.how.title}</h2>
            <p>{t.how.sub}</p>
          </div>
          <div className="steps">
            {t.how.steps.map((step, index) => (
              <article className="step" key={step.title}>
                <div className="step-num">0{index + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="why">
        <div className="container why-grid">
          <div className="why-visual">
            <img src={WHY_IMG} alt="" />
          </div>
          <div>
            <div className="section-head">
              <h2>{t.why.title}</h2>
              <p>{t.why.sub}</p>
            </div>
            <div className="why-points">
              {t.why.points.map((point) => (
                <article className="why-point" key={point.title}>
                  <h3>{point.title}</h3>
                  <p>{point.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <section className="cta-band">
          <h2>{t.cta.title}</h2>
          <p>{t.cta.sub}</p>
          <Link to="/signup" className="btn btn-primary">
            {t.cta.button}
          </Link>
        </section>
      </div>

      <footer className="site-footer">
        <div className="container footer-row">
          <div>
            <div className="footer-brand">{t.brand}</div>
            <p>{t.footer.tagline}</p>
          </div>
          <p>
            © {year} {t.brand}. {t.footer.rights}
          </p>
        </div>
      </footer>
    </>
  )
}
