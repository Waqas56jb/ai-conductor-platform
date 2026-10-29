import { useLanguage } from '../../context/LanguageContext'
import Icon from './icons'
import { Reveal } from './Reveal'
import { useInView } from './useInView'
import SectionHead from './SectionHead'
import './problem-solution.css'

export default function ProblemSolution() {
  const { t } = useLanguage()
  const s = t.landing.problem
  const [listRef, listInView] = useInView()

  return (
    <section className="lp-section lp-problem" aria-labelledby="lp-problem-title">
      <div className="lp-container">
        <SectionHead id="lp-problem-title" eyebrow={s.eyebrow} title={s.title} sub={s.sub} />

        <div className="lp-problem__grid">
          <Reveal className="lp-card lp-problem__col lp-problem__col--before">
            <h3>{s.beforeTitle}</h3>
            <ul>
              {s.before.map((item) => (
                <li key={item}>
                  <span className="lp-problem__mark lp-problem__mark--x">
                    <Icon name="x" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          <div className="lp-problem__arrow" aria-hidden="true">
            <Icon name="arrow" />
          </div>

          <Reveal delay={120} className="lp-card lp-gborder lp-problem__col lp-problem__col--after">
            <h3 className="lp-gradient-text">{s.afterTitle}</h3>
            <p className="lp-problem__lead">{s.afterLead}</p>
            <ul ref={listRef} className={listInView ? 'is-checked' : ''}>
              {s.after.map((item, i) => (
                <li key={item} style={{ '--i': i }}>
                  <span className="lp-problem__mark lp-problem__mark--check">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m6 12.5 4 4L18 8" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
