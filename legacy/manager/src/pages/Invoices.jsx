import { useLanguage } from '../context/LanguageContext'
import { useManagerData } from '../context/ManagerDataContext'

export default function Invoices() {
  const { t, lang } = useLanguage()
  const { invoices, sendReminder } = useManagerData()

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{t.dash.invoices.title}</h2>
          <p className="meta">{t.dash.invoices.sub}</p>
        </div>
      </div>
      <div className="list-stack">
        {invoices.map((inv) => {
          const has7 = inv.reminders.some((r) => r.day === 7)
          const has15 = inv.reminders.some((r) => r.day === 15)
          return (
            <article key={inv.id} className="row-card" style={{ cursor: 'default', alignItems: 'start' }}>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <h3>{inv.title}</h3>
                    <p className="meta">
                      {inv.id} · {inv.incidentId} · due{' '}
                      {new Date(inv.dueAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB')}
                    </p>
                  </div>
                  <span className={`badge${inv.status === 'paid' ? ' ok' : ' danger'}`}>
                    {inv.status === 'paid' ? t.dash.invoices.paid : t.dash.invoices.unpaid}
                  </span>
                </div>
                <p className="amount">
                  {inv.amount} {inv.currency}
                </p>
                <p className="meta">
                  {t.dash.invoices.reminders}:{' '}
                  {inv.reminders.length
                    ? inv.reminders.map((r) => `J+${r.day}`).join(', ')
                    : '—'}
                </p>
                {inv.status === 'unpaid' ? (
                  <div className="action-row">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={has7}
                      onClick={() => sendReminder(inv.id, 7)}
                    >
                      {t.dash.invoices.send7}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={has15}
                      onClick={() => sendReminder(inv.id, 15)}
                    >
                      {t.dash.invoices.send15}
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
