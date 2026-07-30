import { useClientData } from '../../context/ClientDataContext'
import { useLanguage } from '../../context/LanguageContext'

export default function Profile() {
  const { t } = useLanguage()
  const { user } = useClientData()

  const fields = [
    { label: t.signup.name, value: user.name },
    { label: t.signup.email, value: user.email },
    { label: t.signup.phone, value: user.phone },
    { label: t.signup.address, value: user.address },
    { label: t.signup.city, value: user.city },
    { label: t.signup.country, value: user.country },
  ]

  return (
    <section className="panel" style={{ maxWidth: 640 }}>
      <div className="panel-head">
        <div>
          <h2 className="page-title">{t.dash.profile.title}</h2>
          <p className="page-sub">{t.dash.profile.sub}</p>
        </div>
      </div>

      <div className="list-stack">
        {fields.map((field) => (
          <div key={field.label} className="tech-stat">
            <span>{field.label}</span>
            <strong>{field.value}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}
