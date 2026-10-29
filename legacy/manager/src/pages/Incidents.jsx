import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useManagerData } from '../context/ManagerDataContext'

export default function Incidents() {
  const { t } = useLanguage()
  const { incidents } = useManagerData()

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{t.dash.incidents.title}</h2>
          <p className="meta">{t.dash.incidents.sub}</p>
        </div>
      </div>
      <div className="list-stack">
        {incidents.map((inc) => (
          <Link key={inc.id} to={`/dashboard/incidents/${inc.id}`} className="row-card">
            <div>
              <h3>{inc.title}</h3>
              <p className="meta">
                {inc.id} · {t.dash.incidents.channels[inc.channel]} · {inc.complainant} ·{' '}
                {inc.building} / {inc.unit}
              </p>
              <p className="meta">{inc.aiMatch}</p>
            </div>
            <span
              className={`badge${
                ['new', 'awaiting_assignment', 'devis_pending_manager'].includes(inc.status)
                  ? ' warn'
                  : inc.status === 'devis_pending_director'
                    ? ' danger'
                    : ' ok'
              }`}
            >
              {t.dash.incidents.statuses[inc.status]}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
