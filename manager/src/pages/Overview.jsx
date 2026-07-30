import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useManagerData } from '../context/ManagerDataContext'

export default function Overview() {
  const { t } = useLanguage()
  const { kpis, incidents, invoices } = useManagerData()

  const cards = [
    { label: t.dash.kpi.open, value: kpis.open, hint: t.dash.kpi.openHint },
    { label: t.dash.kpi.assign, value: kpis.assign, hint: t.dash.kpi.assignHint },
    { label: t.dash.kpi.devis, value: kpis.devis, hint: t.dash.kpi.devisHint },
    { label: t.dash.kpi.planned, value: kpis.planned, hint: t.dash.kpi.plannedHint },
    { label: t.dash.kpi.unpaid, value: kpis.unpaid, hint: t.dash.kpi.unpaidHint },
  ]

  const alerts = incidents
    .filter((i) => ['new', 'awaiting_assignment'].includes(i.status))
    .slice(0, 5)
  const actions = [
    ...incidents.filter((i) => i.status === 'devis_pending_manager'),
    ...incidents.filter((i) => i.status === 'client_signed'),
    ...invoices.filter((i) => i.status === 'unpaid' && i.reminders.length < 2),
  ].slice(0, 6)

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
              <h2>{t.dash.overview.alerts}</h2>
              <p className="meta">{t.dash.overview.alertsSub}</p>
            </div>
          </div>
          <div className="list-stack">
            {alerts.map((inc) => (
              <Link key={inc.id} to={`/dashboard/incidents/${inc.id}`} className="row-card">
                <div>
                  <h3>{inc.title}</h3>
                  <p className="meta">
                    {inc.id} · {t.dash.incidents.channels[inc.channel]} · {inc.building}
                  </p>
                  <p className="meta">{inc.aiMatch}</p>
                </div>
                <span className="badge warn">{t.dash.incidents.statuses[inc.status]}</span>
              </Link>
            ))}
            {!alerts.length ? <div className="empty">—</div> : null}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{t.dash.overview.actions}</h2>
              <p className="meta">{t.dash.overview.actionsSub}</p>
            </div>
          </div>
          <div className="list-stack">
            {actions.map((item) =>
              item.incidentId ? (
                <Link key={item.id} to="/dashboard/invoices" className="row-card">
                  <div>
                    <h3>{item.title}</h3>
                    <p className="meta">
                      {item.id} · {item.amount} {item.currency}
                    </p>
                  </div>
                  <span className="badge danger">{t.dash.invoices.unpaid}</span>
                </Link>
              ) : (
                <Link key={item.id} to={`/dashboard/incidents/${item.id}`} className="row-card">
                  <div>
                    <h3>{item.title}</h3>
                    <p className="meta">{item.id}</p>
                  </div>
                  <span className="badge warn">{t.dash.incidents.statuses[item.status]}</span>
                </Link>
              ),
            )}
            {!actions.length ? <div className="empty">—</div> : null}
          </div>
        </section>
      </div>
    </>
  )
}
