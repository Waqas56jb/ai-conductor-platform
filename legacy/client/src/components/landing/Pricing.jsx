import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import Icon from './icons'
import { Reveal } from './Reveal'
import SectionHead from './SectionHead'
import './pricing.css'

const ANNUAL_DISCOUNT = 0.2

function formatEuro(amount, lang) {
  const whole = Number.isInteger(amount)
  return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function Pricing() {
  const { t, lang } = useLanguage()
  const s = t.landing.pricing
  const [annual, setAnnual] = useState(false)

  return (
    <section id="tarifs" className="lp-section lp-pricing" aria-labelledby="lp-pricing-title">
      <div className="lp-container">
        <SectionHead id="lp-pricing-title" eyebrow={s.eyebrow} title={s.title} sub={s.sub} />

        <Reveal className="lp-billing" role="group" aria-label={s.billingLabel}>
          <button type="button" aria-pressed={!annual} onClick={() => setAnnual(false)}>
            {s.monthly}
          </button>
          <button type="button" aria-pressed={annual} onClick={() => setAnnual(true)}>
            {s.annual}
            <span className="lp-billing__save">{s.save}</span>
          </button>
        </Reveal>

        <ul className="lp-pricing__grid">
          {s.plans.map((plan, i) => {
            const featured = i === 1
            const monthly = plan.price === null ? null : annual ? plan.price * (1 - ANNUAL_DISCOUNT) : plan.price
            return (
              <Reveal as="li" key={plan.name} delay={i * 100}>
                <article className={`lp-card lp-plan${featured ? ' lp-gborder is-featured' : ''}`}>
                  {featured ? <span className="lp-plan__badge">{s.popular}</span> : null}
                  <h3>{plan.name}</h3>
                  <p className="lp-plan__desc">{plan.desc}</p>

                  <div className="lp-plan__price" aria-live="polite">
                    {monthly === null ? (
                      <>
                        <strong className="lp-plan__amount lp-plan__amount--quote">{s.quote}</strong>
                        <span className="lp-plan__billing">{s.quoteNote}</span>
                      </>
                    ) : (
                      <>
                        <span className="lp-plan__row">
                          <strong className="lp-plan__amount">{formatEuro(monthly, lang)}</strong>
                          <span className="lp-plan__per">{s.perMonth}</span>
                        </span>
                        <span className="lp-plan__billing">
                          {annual
                            ? s.billedAnnually.replace('{total}', formatEuro(monthly * 12, lang))
                            : s.billedMonthly}
                        </span>
                      </>
                    )}
                  </div>

                  <Link
                    to="/signup"
                    className={`ai-btn ai-btn--block ${featured ? 'ai-btn--primary' : 'ai-btn--ghost'}`}
                  >
                    {plan.price === null ? s.ctaEnterprise : s.cta}
                    <Icon name="arrow" />
                  </Link>

                  <ul className="lp-checklist lp-plan__features">
                    {plan.features.map((feature) => (
                      <li key={feature} className={feature.endsWith(':') ? 'is-heading' : ''}>
                        {feature.endsWith(':') ? null : <Icon name="check" />}
                        {feature}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            )
          })}
        </ul>

        <p className="lp-pricing__note">{s.note}</p>
      </div>
    </section>
  )
}
