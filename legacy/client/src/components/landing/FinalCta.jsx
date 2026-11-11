import { appLink } from '../../appUrl'
import { useLanguage } from '../../context/LanguageContext'
import DemoCta from './DemoCta'
import Icon from './icons'
import { Reveal } from './Reveal'
import './final-cta.css'

export default function FinalCta() {
  const { t } = useLanguage()
  const s = t.landing.finalCta

  return (
    <section className="lp-final" aria-labelledby="lp-final-title">
      <div className="lp-container">
        <Reveal className="lp-final__band">
          <div className="lp-final__grid" aria-hidden="true" />
          <h2 className="lp-final__title" id="lp-final-title">
            {s.title}
          </h2>
          <p className="lp-final__sub">{s.sub}</p>
          <div className="lp-final__ctas">
            <DemoCta placement="final">
              {s.demo}
              <Icon name="arrow" />
            </DemoCta>
            <a href={appLink('/signup')} className="ai-btn ai-btn--ghost">
              {s.signup}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
