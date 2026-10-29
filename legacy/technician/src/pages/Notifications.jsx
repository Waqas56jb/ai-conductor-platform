import { Link } from 'react-router-dom'
import { useTechData } from '../context/TechDataContext'
import { useLanguage } from '../context/LanguageContext'

export default function Notifications() {
  const { t, lang } = useLanguage()
  const { notifications, markAllNotificationsRead } = useTechData()

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{t.dash.notifications.title}</h2>
          <p className="meta">{t.dash.notifications.sub}</p>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={markAllNotificationsRead}>
          {t.dash.notifications.markRead}
        </button>
      </div>

      {!notifications.length ? (
        <div className="empty">{t.dash.notifications.empty}</div>
      ) : (
        <div className="list-stack">
          {notifications.map((n) => (
            <Link
              key={n.id}
              to={n.taskId ? `/dashboard/tasks/${n.taskId}` : '/dashboard/tasks'}
              className="row-card"
            >
              <div>
                <h3>{n.title}</h3>
                <p className="meta">{n.body}</p>
                <p className="meta">
                  {new Date(n.at).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB')}
                </p>
              </div>
              {!n.read ? <span className="badge danger">New</span> : <span className="badge ok">Read</span>}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
