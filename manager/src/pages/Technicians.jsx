import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useManagerData } from '../context/ManagerDataContext'

export default function Technicians() {
  const { t } = useLanguage()
  const { technicians } = useManagerData()

  const center = technicians[0] || { lat: 48.8566, lng: 2.3522 }

  return (
    <div className="two-col">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{t.dash.techs.title}</h2>
            <p className="meta">{t.dash.techs.sub}</p>
          </div>
        </div>
        <div className="map-frame">
          <iframe
            title="all-techs"
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${center.lng - 0.06}%2C${
              center.lat - 0.04
            }%2C${center.lng + 0.06}%2C${center.lat + 0.04}&layer=mapnik&marker=${center.lat}%2C${
              center.lng
            }`}
          />
        </div>
        <p className="meta" style={{ marginTop: 10 }}>
          {t.dash.techs.openMap}
        </p>
      </section>

      <section className="panel">
        <div className="list-stack">
          {technicians.map((tech) => (
            <article key={tech.id} className="row-card" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <img
                  src={tech.photo}
                  alt=""
                  style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover' }}
                />
                <div>
                  <h3>{tech.name}</h3>
                  <p className="meta">
                    {tech.specialty} · ★ {tech.rating} · {tech.experienceYears} yrs
                  </p>
                  <p className="meta">
                    {tech.lat.toFixed(4)}, {tech.lng.toFixed(4)} · {tech.city}
                  </p>
                </div>
              </div>
              <span className={`badge${tech.available ? ' ok' : ' warn'}`}>
                {tech.available ? t.dash.detail.available : t.dash.detail.busy}
              </span>
            </article>
          ))}
        </div>
        <Link to="/dashboard/incidents" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
          {t.dash.nav.incidents}
        </Link>
      </section>
    </div>
  )
}
