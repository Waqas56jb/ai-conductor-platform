import { useLanguage } from '../context/LanguageContext'
import { useDirectorData } from '../context/DirectorDataContext'

export default function Cases() {
  const { t } = useLanguage()
  const { cases } = useDirectorData()

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{t.dash.cases.title}</h2>
          <p className="meta">{t.dash.cases.sub}</p>
        </div>
      </div>
      <div className="list-stack">
        {cases.map((c) => (
          <article key={c.id} className="row-card" style={{ cursor: 'default' }}>
            <div>
              <h3>{c.title}</h3>
              <p className="meta">
                {c.id} · {c.building} · {c.manager}
                {c.amount != null ? ` · ${c.amount} ${c.currency}` : ''}
              </p>
              <div style={{ marginTop: 6 }}>
                {c.hiredTechs.map((name) => (
                  <span className="chip" key={name}>
                    {name}
                  </span>
                ))}
              </div>
            </div>
            <span
              className={`badge${
                c.status === 'devis_pending_director'
                  ? ' danger'
                  : ['intervention_planned', 'in_progress', 'approved_sent'].includes(c.status)
                    ? ' ok'
                    : ' warn'
              }`}
            >
              {t.dash.cases.statuses[c.status] || c.status}
            </span>
          </article>
        ))}
      </div>
    </section>
  )
}
