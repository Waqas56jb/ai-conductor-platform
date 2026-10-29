import { useLanguage } from '../context/LanguageContext'
import { useDirectorData } from '../context/DirectorDataContext'

export default function Interventions() {
  const { t, lang } = useLanguage()
  const { cases } = useDirectorData()

  const list = cases
    .filter((c) => ['intervention_planned', 'in_progress'].includes(c.status))
    .sort((a, b) => new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0))

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{t.dash.interventions.title}</h2>
          <p className="meta">{t.dash.interventions.sub}</p>
        </div>
      </div>
      <div className="list-stack">
        {!list.length ? (
          <div className="empty">{t.dash.interventions.empty}</div>
        ) : (
          list.map((c) => (
            <article key={c.id} className="row-card" style={{ cursor: 'default' }}>
              <div>
                <h3>{c.title}</h3>
                <p className="meta">
                  {c.id} · {c.building}
                  {c.scheduledAt
                    ? ` · ${t.dash.interventions.scheduled} ${new Date(c.scheduledAt).toLocaleString(
                        lang === 'fr' ? 'fr-FR' : 'en-GB',
                      )}`
                    : ''}
                </p>
                <div style={{ marginTop: 6 }}>
                  {c.hiredTechs.map((name) => (
                    <span className="chip" key={name}>
                      {name}
                    </span>
                  ))}
                </div>
              </div>
              <span className="badge ok">{t.dash.cases.statuses[c.status]}</span>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
