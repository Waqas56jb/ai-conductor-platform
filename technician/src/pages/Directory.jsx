import { useTechData } from '../context/TechDataContext'
import { useLanguage } from '../context/LanguageContext'

export default function Directory() {
  const { t } = useLanguage()
  const { profile } = useTechData()

  return (
    <div className="two-col">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{t.dash.directory.title}</h2>
            <p className="meta">{t.dash.directory.sub}</p>
          </div>
          <span className="badge ok">{t.dash.directory.visible}</span>
        </div>

        <div className="photo-pick" style={{ marginBottom: 16 }}>
          <img className="profile-photo" src={profile.photo} alt="" style={{ width: 96, height: 96 }} />
          <div>
            <h3 style={{ margin: 0 }}>{profile.name}</h3>
            <p className="meta">
              {profile.specialty} · {profile.experienceYears} yrs · age {profile.age}
            </p>
            <p className="meta">{profile.location.address}</p>
            <p className="meta">
              {t.dash.directory.coords}: {profile.location.lat.toFixed(5)},{' '}
              {profile.location.lng.toFixed(5)}
            </p>
          </div>
        </div>

        <div
          style={{
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid var(--line)',
            minHeight: 240,
            background: '#0a2540',
          }}
        >
          <iframe
            title="map"
            width="100%"
            height="240"
            style={{ border: 0, display: 'block' }}
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${
              profile.location.lng - 0.02
            }%2C${profile.location.lat - 0.015}%2C${profile.location.lng + 0.02}%2C${
              profile.location.lat + 0.015
            }&layer=mapnik&marker=${profile.location.lat}%2C${profile.location.lng}`}
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{t.dash.directory.flowTitle}</h2>
          </div>
        </div>
        <ol className="steps-list">
          {t.dash.directory.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </div>
  )
}
