import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useDirectorData } from '../context/DirectorDataContext'

export default function Overview() {
  const { t } = useLanguage()
  const { kpis, cases, invoices, settings } = useDirectorData()

  const cards = [
    { label: t.dash.kpi.cases, value: kpis.ongoing, hint: t.dash.kpi.casesHint },
    { label: t.dash.kpi.interventions, value: kpis.interventions, hint: t.dash.kpi.interventionsHint },
    { label: t.dash.kpi.unpaid, value: kpis.unpaid, hint: t.dash.kpi.unpaidHint },
    { label: t.dash.kpi.reminders, value: kpis.remindersDue, hint: t.dash.kpi.remindersHint },
    { label: t.dash.kpi.pending, value: kpis.pending, hint: t.dash.kpi.pendingHint },
    {
      label: t.dash.kpi.exposure,
      value: `${kpis.exposure.toLocaleString()} €`,
      hint: t.dash.kpi.exposureHint,
    },
  ]

  const queue = cases.filter((c) => c.status === 'devis_pending_director')
  const unpaid = invoices.filter((i) => i.status === 'unpaid').slice(0, 5)

  return (
    <>
      <div className="banner info">
        <span className="live-dot" />
        {t.dash.overview.live} — {t.dash.approvals.threshold}:{' '}
        <strong>{settings.approvalThresholdEur} EUR</strong>
      </div>

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
              <h2>{t.dash.overview.queue}</h2>
              <p className="meta">{t.dash.overview.queueSub}</p>
            </div>
            <Link to="/dashboard/approvals" className="btn btn-primary btn-sm">
              {t.dash.nav.approvals}
            </Link>
          </div>
          <div className="list-stack">
            {!queue.length ? (
              <div className="empty">{t.dash.approvals.empty}</div>
            ) : (
              queue.map((c) => (
                <Link key={c.id} to="/dashboard/approvals" className="row-card">
                  <div>
                    <h3>{c.title}</h3>
                    <p className="meta">
                      {c.id} · {c.building} · {c.amount} {c.currency}
                    </p>
                  </div>
                  <span className="badge danger">{t.dash.cases.statuses[c.status]}</span>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{t.dash.overview.unpaid}</h2>
              <p className="meta">{t.dash.overview.unpaidSub}</p>
            </div>
            <Link to="/dashboard/finance" className="btn btn-outline btn-sm">
              {t.dash.nav.finance}
            </Link>
          </div>
          <div className="list-stack">
            {unpaid.map((inv) => (
              <Link key={inv.id} to="/dashboard/finance" className="row-card">
                <div>
                  <h3>{inv.title}</h3>
                  <p className="meta">
                    {inv.client} · {inv.amount} {inv.currency} · reminders{' '}
                    {inv.reminders.map((r) => `J+${r.day}`).join(', ') || '—'}
                  </p>
                </div>
                <span className="badge danger">{t.dash.finance.unpaid}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
