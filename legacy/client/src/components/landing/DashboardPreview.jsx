import { useLanguage } from '../../context/LanguageContext'
import Icon from './icons'
import { Reveal } from './Reveal'
import SectionHead from './SectionHead'
import './dashboard-preview.css'

const KPI_ICONS = ['folder', 'file', 'bell', 'checkCircle']
const SIDEBAR_ICONS = ['home', 'folder', 'mail', 'file', 'users', 'chart']
// Bar heights (%) for the illustrative weekly chart.
const BARS = [46, 72, 58, 88, 64]

export default function DashboardPreview() {
  const { t } = useLanguage()
  const s = t.landing.dashboard

  return (
    <section id="tableau-de-bord" className="lp-section lp-dash" aria-labelledby="lp-dash-title">
      <div className="lp-container">
        <SectionHead id="lp-dash-title" eyebrow={s.eyebrow} title={s.title} sub={s.sub} />

        <Reveal as="ul" className="lp-dash__points">
          {s.points.map((point) => (
            <li key={point}>
              <Icon name="check" />
              {point}
            </li>
          ))}
        </Reveal>

        <Reveal className="lp-dash__stage">
          {/* Decorative mock UI; the figures are illustrative. */}
          <figure className="lp-dash__window" aria-label={`${s.appTitle} — ${s.mockLabel}`}>
            <span className="lp-dash__badge">{s.mockLabel}</span>
            <div className="lp-dash__chrome" aria-hidden="true">
              <span className="lp-dash__dots">
                <i />
                <i />
                <i />
              </span>
              <span className="lp-dash__url">{s.appTitle}</span>
            </div>

            <div className="lp-dash__body">
              <aside className="lp-dash__side" aria-hidden="true">
                <span className="lp-dash__logo" />
                {SIDEBAR_ICONS.map((name, i) => (
                  <span key={name} className={i === 0 ? 'is-active' : ''}>
                    <Icon name={name} />
                  </span>
                ))}
              </aside>

              <div className="lp-dash__main">
                <div className="lp-dash__hello">
                  <strong>{s.greeting}</strong>
                  <span>{s.date}</span>
                </div>

                <div className="lp-dash__kpis">
                  {s.kpis.map((kpi, i) => (
                    <div className="lp-dash__kpi" key={kpi.label}>
                      <span className="lp-dash__kpi-icon">
                        <Icon name={KPI_ICONS[i]} />
                      </span>
                      <span className="lp-dash__kpi-label">{kpi.label}</span>
                      <strong>{kpi.value}</strong>
                      <span className="lp-dash__kpi-trend">{kpi.trend}</span>
                    </div>
                  ))}
                </div>

                <div className="lp-dash__panels">
                  <div className="lp-dash__panel">
                    <h3>{s.prioritiesTitle}</h3>
                    <ul className="lp-dash__prio">
                      {s.priorities.map((p, i) => (
                        <li key={p.text}>
                          <span className={`lp-dash__check${i === 0 ? ' is-urgent' : ''}`} />
                          <span className="lp-dash__prio-text">{p.text}</span>
                          <span className={`lp-dash__tag lp-dash__tag--${i}`}>{p.tag}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="lp-dash__panel">
                    <h3>
                      <span className="lp-dash__pulse" aria-hidden="true" />
                      {s.alertsTitle}
                    </h3>
                    <ul className="lp-dash__alerts">
                      {s.alerts.map((a, i) => (
                        <li key={a.text} style={{ '--i': i }}>
                          <span className="lp-dash__alert-text">{a.text}</span>
                          <span className="lp-dash__time">{a.time}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="lp-dash__panel lp-dash__panel--chart">
                    <h3>{s.chartTitle}</h3>
                    <div className="lp-dash__chart" aria-hidden="true">
                      {BARS.map((h, i) => (
                        <div key={s.days[i]} className="lp-dash__bar">
                          <span style={{ '--h': `${h}%`, '--i': i }} />
                          <small>{s.days[i]}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </figure>
        </Reveal>
      </div>
    </section>
  )
}
