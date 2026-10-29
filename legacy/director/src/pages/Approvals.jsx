import { useLanguage } from '../context/LanguageContext'
import { useDirectorData } from '../context/DirectorDataContext'

export default function Approvals() {
  const { t } = useLanguage()
  const { cases, settings, approveDevis, rejectDevis } = useDirectorData()
  const queue = cases.filter((c) => c.status === 'devis_pending_director')

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{t.dash.approvals.title}</h2>
          <p className="meta">{t.dash.approvals.sub}</p>
        </div>
        <span className="badge">
          {t.dash.approvals.threshold}: {settings.approvalThresholdEur} EUR
        </span>
      </div>

      <div className="list-stack">
        {!queue.length ? (
          <div className="empty">{t.dash.approvals.empty}</div>
        ) : (
          queue.map((c) => (
            <article key={c.id} className="row-card" style={{ cursor: 'default', alignItems: 'start' }}>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <h3>{c.title}</h3>
                    <p className="meta">
                      {c.id} · {c.building}, {c.city} · {t.dash.approvals.manager}: {c.manager}
                    </p>
                  </div>
                  <span className="badge danger">{t.dash.cases.statuses[c.status]}</span>
                </div>

                <p className="amount">
                  {c.amount?.toLocaleString()} {c.currency}
                </p>
                <p>{c.aiReport}</p>
                <p className="meta" style={{ marginTop: 6 }}>
                  {c.constat}
                </p>

                {c.photos?.length ? (
                  <div className="thumb-row">
                    {c.photos.map((src, i) => (
                      <img className="thumb" key={i} src={src} alt="" />
                    ))}
                  </div>
                ) : null}

                <ul className="line-items">
                  {c.lines.map((line) => (
                    <li key={line.label}>
                      <span>{line.label}</span>
                      <strong>
                        {line.amount} {c.currency}
                      </strong>
                    </li>
                  ))}
                </ul>

                <p className="meta" style={{ marginTop: 10 }}>
                  {t.dash.approvals.team}:
                </p>
                <div>
                  {c.hiredTechs.map((name) => (
                    <span className="chip" key={name}>
                      {name}
                    </span>
                  ))}
                </div>

                <div className="action-row">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => approveDevis(c.id)}
                  >
                    {t.dash.approvals.approve}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => rejectDevis(c.id)}
                  >
                    {t.dash.approvals.reject}
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
