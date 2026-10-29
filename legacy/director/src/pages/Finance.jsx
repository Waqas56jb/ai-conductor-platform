import { useLanguage } from '../context/LanguageContext'
import { useDirectorData } from '../context/DirectorDataContext'

export default function Finance() {
  const { t, lang } = useLanguage()
  const { invoices, settings, sendReminder } = useDirectorData()

  const unpaidTotal = invoices
    .filter((i) => i.status === 'unpaid')
    .reduce((s, i) => s + i.amount, 0)
  const paidTotal = invoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + i.amount, 0)

  return (
    <>
      <div className="finance-strip">
        <article className="kpi-card">
          <p className="kpi-label">{t.dash.finance.totalUnpaid}</p>
          <p className="kpi-value">
            {unpaidTotal.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB')} EUR
          </p>
          <p className="kpi-hint">{t.dash.kpi.unpaidHint}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">{t.dash.finance.totalPaid}</p>
          <p className="kpi-value">
            {paidTotal.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB')} EUR
          </p>
          <p className="kpi-hint">
            J+{settings.reminderDay1} / J+{settings.reminderDay2}
          </p>
        </article>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{t.dash.finance.title}</h2>
            <p className="meta">{t.dash.finance.sub}</p>
          </div>
        </div>
        <div className="list-stack">
          {invoices.map((inv) => {
            const has7 = inv.reminders.some((r) => r.day === settings.reminderDay1)
            const has15 = inv.reminders.some((r) => r.day === settings.reminderDay2)
            return (
              <article key={inv.id} className="row-card" style={{ cursor: 'default', alignItems: 'start' }}>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <h3>{inv.title}</h3>
                      <p className="meta">
                        {inv.id} · {inv.caseId} · {inv.client} · due{' '}
                        {new Date(inv.dueAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB')}
                      </p>
                    </div>
                    <span className={`badge${inv.status === 'paid' ? ' ok' : ' danger'}`}>
                      {inv.status === 'paid' ? t.dash.finance.paid : t.dash.finance.unpaid}
                    </span>
                  </div>
                  <p className="amount">
                    {inv.amount} {inv.currency}
                  </p>
                  <p className="meta">
                    {t.dash.finance.reminders}:{' '}
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
                        onClick={() => sendReminder(inv.id, settings.reminderDay1)}
                      >
                        {t.dash.finance.send7}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={has15}
                        onClick={() => sendReminder(inv.id, settings.reminderDay2)}
                      >
                        {t.dash.finance.send15}
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </>
  )
}
