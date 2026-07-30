import { useRef } from 'react'
import { useClientData } from '../../context/ClientDataContext'
import { useLanguage } from '../../context/LanguageContext'
import { statusLabel } from '../../data/mockData'

export default function Invoices() {
  const { t, lang } = useLanguage()
  const { invoices, uploadReceipt } = useClientData()
  const fileRefs = useRef({})

  function onFile(invoiceId, event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => uploadReceipt(invoiceId, String(reader.result))
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2 className="page-title">{t.dash.invoices.title}</h2>
          <p className="page-sub">{t.dash.invoices.sub}</p>
        </div>
      </div>

      <div className="list-stack">
        {invoices.map((inv) => (
          <article key={inv.id} className="invoice-row" style={{ cursor: 'default', alignItems: 'start' }}>
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h3>{inv.title}</h3>
                  <p className="meta">
                    {inv.id} · {t.dash.invoices.caseRef} {inv.caseId} · {t.dash.invoices.due}{' '}
                    {new Date(inv.dueAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB')}
                  </p>
                </div>
                <span
                  className={`badge${
                    inv.status === 'paid' ? ' ok' : inv.status === 'under_review' ? ' warn' : ' danger'
                  }`}
                >
                  {statusLabel(inv.status, lang)}
                </span>
              </div>

              <p className="amount">
                {inv.amount.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB')} {inv.currency}
              </p>

              {inv.receiptUrl ? (
                <img className="receipt-preview" src={inv.receiptUrl} alt={t.dash.invoices.receipt} />
              ) : null}

              {inv.status !== 'paid' ? (
                <div className="action-row">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => fileRefs.current[inv.id]?.click()}
                  >
                    {inv.receiptUrl ? t.dash.invoices.replaceReceipt : t.dash.invoices.uploadReceipt}
                  </button>
                  <input
                    ref={(el) => {
                      fileRefs.current[inv.id] = el
                    }}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => onFile(inv.id, e)}
                  />
                </div>
              ) : (
                <p className="meta" style={{ marginTop: '0.7rem' }}>
                  {t.dash.invoices.paidNote}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
