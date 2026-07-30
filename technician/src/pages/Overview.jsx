import { Link } from 'react-router-dom'
import { useTechData } from '../context/TechDataContext'
import { useLanguage } from '../context/LanguageContext'

export default function Overview() {
  const { t, lang } = useLanguage()
  const { kpis, tasks, notifications, profile } = useTechData()

  const activeTasks = tasks.filter((task) => task.stage !== 'completed').slice(0, 4)
  const alerts = notifications.slice(0, 4)

  const cards = [
    { label: t.dash.kpi.active, value: kpis.active, hint: t.dash.kpi.activeHint },
    { label: t.dash.kpi.reports, value: kpis.reports, hint: t.dash.kpi.reportsHint },
    {
      label: t.dash.kpi.hired,
      value: profile.visibleToManager ? (lang === 'fr' ? 'Carte' : 'On map') : '—',
      hint: t.dash.kpi.hiredHint,
    },
    { label: t.dash.kpi.unread, value: kpis.unread, hint: t.dash.kpi.unreadHint },
  ]

  return (
    <>
      <div className="kpi-grid">
        {cards.map((c) => (
          <article className="kpi-card" key={c.label}>
            <p className="kpi-label">{c.label}</p>
            <p className="kpi-value">{c.value}</p>
            <p className="kpi-hint">{c.hint}</p>
          </article>
        ))}
      </div>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{t.dash.overview.next}</h2>
              <p className="meta">{t.dash.overview.nextSub}</p>
            </div>
            <Link to="/dashboard/tasks" className="btn btn-primary btn-sm">
              {t.dash.overview.viewAll}
            </Link>
          </div>
          <div className="list-stack">
            {activeTasks.map((task) => (
              <Link key={task.id} to={`/dashboard/tasks/${task.id}`} className="row-card">
                <div>
                  <h3>{task.title}</h3>
                  <p className="meta">
                    {task.id} · {task.buildingAddress}
                  </p>
                </div>
                <span className={`badge${task.stage.includes('assigned') ? ' ok' : ' warn'}`}>
                  {t.dash.tasks.stages[task.stage]}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{t.dash.overview.alerts}</h2>
              <p className="meta">{t.dash.overview.alertsSub}</p>
            </div>
          </div>
          <div className="list-stack">
            {alerts.map((n) => (
              <article key={n.id} className="row-card" style={{ cursor: 'default' }}>
                <div>
                  <h3>{n.title}</h3>
                  <p className="meta">{n.body}</p>
                </div>
                {!n.read ? <span className="badge danger">New</span> : <span className="badge">OK</span>}
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
