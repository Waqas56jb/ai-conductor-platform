import { useClientData } from '../../context/ClientDataContext'
import { useLanguage } from '../../context/LanguageContext'
import { statusLabel } from '../../data/mockData'

export default function Quotations() {
  const { t, lang } = useLanguage()
  const { quotations, respondQuotation } = useClientData()

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2 className="page-title">{t.dash.quotes.title}</h2>
          <p className="page-sub">{t.dash.quotes.sub}</p>
        </div>
      </div>

      <div className="list-stack">
        {quotations.map((q) => (
          <article key={q.id} className="quote-row" style={{ cursor: 'default', alignItems: 'start' }}>
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h3>{q.title}</h3>
                  <p className="meta">
                    {q.id} · {t.dash.quotes.caseRef} {q.caseId}
                    {q.fromDirector ? ` · ${t.dash.quotes.fromDirector}` : ''}
                    {q.approvedByManager ? ` · ${t.dash.quotes.managerOk}` : ''}
                  </p>
                </div>
                <span
                  className={`badge${
                    q.status === 'accepted' ? ' ok' : q.status === 'rejected' ? ' danger' : ' warn'
                  }`}
                >
                  {statusLabel(q.status, lang)}
                </span>
              </div>

              <p className="amount">
                {q.amount.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB')} {q.currency}
              </p>

              <ul className="line-items">
                {q.lines.map((line) => (
                  <li key={line.label}>
                    <span>{line.label}</span>
                    <strong>
                      {line.amount} {q.currency}
                    </strong>
                  </li>
                ))}
              </ul>

              {q.status === 'pending_client' ? (
                <div className="action-row">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => respondQuotation(q.id, 'accept')}
                  >
                    {t.dash.quotes.accept}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => respondQuotation(q.id, 'reject')}
                  >
                    {t.dash.quotes.reject}
                  </button>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
