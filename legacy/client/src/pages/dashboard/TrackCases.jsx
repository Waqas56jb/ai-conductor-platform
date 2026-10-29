import { Link } from 'react-router-dom'
import { useClientData } from '../../context/ClientDataContext'
import { useLanguage } from '../../context/LanguageContext'
import { statusLabel } from '../../data/mockData'

export default function TrackCases() {
  const { t, lang } = useLanguage()
  const { cases, techProfiles } = useClientData()

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2 className="page-title">{t.dash.track.title}</h2>
          <p className="page-sub">{t.dash.track.sub}</p>
        </div>
        <Link to="/dashboard/report" className="btn btn-primary btn-sm">
          {t.dash.overview.reportCta}
        </Link>
      </div>

      <div className="list-stack">
        {cases.map((item) => {
          const tech = item.technicianId ? techProfiles[item.technicianId] : null
          return (
            <Link key={item.id} to={`/dashboard/track/${item.id}`} className="case-row">
              <div>
                <h3>{item.title}</h3>
                <p className="meta">
                  {item.id} · {item.buildingAddress}
                  {tech ? ` · ${tech.name}` : ` · ${t.dash.track.noTech}`}
                </p>
              </div>
              <span
                className={`badge${item.technicianId ? ' ok' : ' warn'}`}
              >
                {statusLabel(item.status, lang)}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
