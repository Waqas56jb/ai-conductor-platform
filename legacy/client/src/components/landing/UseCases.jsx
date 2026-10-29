import { useRef, useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import Icon from './icons'
import { Reveal } from './Reveal'
import { useInView } from './useInView'
import SectionHead from './SectionHead'
import './use-cases.css'

export default function UseCases() {
  const { t } = useLanguage()
  const s = t.landing.usecases
  const [active, setActive] = useState(0)
  const tabRefs = useRef([])
  const [flowRef, flowInView] = useInView()
  const tab = s.tabs[active]

  // Arrow keys move between tabs (WAI-ARIA tabs pattern, automatic activation).
  function onKeyDown(e) {
    const last = s.tabs.length - 1
    const next = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: last }[e.key]
    if (next === undefined) return
    e.preventDefault()
    const index = next < 0 ? last : next > last ? 0 : next
    setActive(index)
    tabRefs.current[index]?.focus()
  }

  return (
    <section className="lp-section lp-usecases" aria-labelledby="lp-usecases-title">
      <div className="lp-container">
        <SectionHead id="lp-usecases-title" eyebrow={s.eyebrow} title={s.title} sub={s.sub} />

        <Reveal className="lp-usecases__tabs" role="tablist" aria-label={s.tabsLabel} onKeyDown={onKeyDown}>
          {s.tabs.map((item, i) => (
            <button
              key={item.label}
              ref={(el) => (tabRefs.current[i] = el)}
              type="button"
              role="tab"
              id={`lp-uc-tab-${i}`}
              aria-selected={active === i}
              aria-controls="lp-uc-panel"
              tabIndex={active === i ? 0 : -1}
              className={active === i ? 'is-active' : ''}
              onClick={() => setActive(i)}
            >
              {item.label}
            </button>
          ))}
        </Reveal>

        <Reveal
          className="lp-card lp-gborder lp-usecases__panel"
          role="tabpanel"
          id="lp-uc-panel"
          aria-labelledby={`lp-uc-tab-${active}`}
        >
          <div className="lp-usecases__story">
            <h3>{tab.label}</h3>
            <p>{tab.text}</p>
          </div>

          {/* Keyed by tab so the step animation replays on every switch. */}
          <ol
            key={active}
            ref={flowRef}
            className={`lp-flow${flowInView ? ' is-running' : ''}`}
          >
            {tab.steps.map((step, i) => (
              <li key={step} style={{ '--i': i }}>
                <span className="lp-flow__dot">
                  <span className="lp-flow__num">{i + 1}</span>
                  <Icon name="check" />
                </span>
                <span className="lp-flow__label">{step}</span>
                <span className="lp-flow__state">{s.done} ✓</span>
              </li>
            ))}
            <li className="lp-flow__result" style={{ '--i': tab.steps.length }}>
              <Icon name="checkCircle" />
              {tab.result}
            </li>
          </ol>
        </Reveal>
      </div>
    </section>
  )
}
