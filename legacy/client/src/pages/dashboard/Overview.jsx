import { Link } from 'react-router-dom'
import { useClientData } from '../../context/ClientDataContext'
import { useLanguage } from '../../context/LanguageContext'
import { statusLabel } from '../../data/mockData'

export default function Overview() {
  const { t, lang } = useLanguage()
  const { kpis, cases, quotations, invoices } = useClientData()

  const recent = cases.slice(0, 4)
  const pendingQuotes = quotations.filter((q) => q.status === 'pending_client')
  const unpaid = invoices.filter((i) => i.status !== 'paid')

  const cards = [
    { label: t.dash.kpi.open, value: kpis.open, hint: t.dash.kpi.openHint },
    { label: t.dash.kpi.assigned, value: kpis.assigned, hint: t.dash.kpi.assignedHint },
    { label: t.dash.kpi.quotes, value: kpis.pendingQuotes, hint: t.dash.kpi.quotesHint },
    { label: t.dash.kpi.unpaid, value: kpis.unpaid, hint: t.dash.kpi.unpaidHint },
  ]

  return (
    <>
      <div className="kpi-grid">
        {cards.map((card) => (
          <article className="kpi-card" key={card.label}>
            <p className="kpi-label">{card.label}</p>
            <p className="kpi-value">{card.value}</p>
            <p className="kpi-hint">{card.hint}</p>
          </article>
        ))}
      </div>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{t.dash.overview.recent}</h2>
              <p>{t.dash.overview.recentSub}</p>
            </div>
            <Link to="/dashboard/report" className="btn btn-primary btn-sm">
              {t.dash.overview.reportCta}
            </Link>
          </div>
          <div className="list-stack">
            {recent.map((item) => (
              <Link key={item.id} to={`/dashboard/track/${item.id}`} className="case-row">
                <div>
                  <h3>{item.title}</h3>
                  <p className="meta">
                    {item.id} · {item.buildingAddress}
                  </p>
                </div>
                <span className="badge">{statusLabel(item.status, lang)}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{t.dash.overview.attention}</h2>
              <p>{t.dash.overview.attentionSub}</p>
            </div>
          </div>
          <div className="list-stack">
            {pendingQuotes.map((q) => (
              <Link key={q.id} to="/dashboard/quotations" className="quote-row">
                <div>
                  <h3>{q.title}</h3>
                  <p className="meta">
                    {q.id} · {q.amount} {q.currency}
                  </p>
                </div>
                <span className="badge warn">{statusLabel(q.status, lang)}</span>
              </Link>
            ))}
            {unpaid.map((inv) => (
              <Link key={inv.id} to="/dashboard/invoices" className="invoice-row">
                <div>
                  <h3>{inv.title}</h3>
                  <p className="meta">
                    {inv.id} · {inv.amount} {inv.currency}
                  </p>
                </div>
                <span className="badge danger">{statusLabel(inv.status, lang)}</span>
              </Link>
            ))}
            {!pendingQuotes.length && !unpaid.length ? (
              <div className="empty-state">{t.dash.overview.allClear}</div>
            ) : null}
          </div>
        </section>
      </div>
    </>
  )
}
