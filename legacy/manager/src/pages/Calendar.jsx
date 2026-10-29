import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useManagerData } from '../context/ManagerDataContext'

export default function Calendar() {
  const { t, lang } = useLanguage()
  const { incidents, technicians } = useManagerData()

  const planned = incidents
    .filter((i) =>
      ['intervention_planned', 'in_progress', 'client_signed'].includes(i.status),
    )
    .sort((a, b) => new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0))

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{t.dash.calendar.title}</h2>
          <p className="meta">{t.dash.calendar.sub}</p>
        </div>
      </div>
      <div className="list-stack">
        {!planned.length ? (
          <div className="empty">{t.dash.calendar.empty}</div>
        ) : (
          planned.map((inc) => {
            const team = technicians.filter((tech) => inc.hiredTechIds.includes(tech.id))
            return (
              <Link key={inc.id} to={`/dashboard/incidents/${inc.id}`} className="row-card">
                <div>
                  <h3>{inc.title}</h3>
                  <p className="meta">
                    {inc.id} · {inc.building}
                    {inc.scheduledAt
                      ? ` · ${new Date(inc.scheduledAt).toLocaleString(
                          lang === 'fr' ? 'fr-FR' : 'en-GB',
                        )}`
                      : ` · ${t.dash.incidents.statuses.client_signed}`}
                  </p>
                  <div className="member-row" style={{ marginTop: 8 }}>
                    {team.map((tech) => (
                      <span className="member-chip" key={tech.id}>
                        <img src={tech.photo} alt="" />
                        {tech.name}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="badge ok">{t.dash.incidents.statuses[inc.status]}</span>
              </Link>
            )
          })
        )}
      </div>
    </section>
  )
}
