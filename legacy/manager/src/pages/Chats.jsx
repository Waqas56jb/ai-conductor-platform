import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useManagerData } from '../context/ManagerDataContext'

export default function Chats() {
  const { t } = useLanguage()
  const { incidents, groupChats, technicians } = useManagerData()

  const groups = incidents.filter((i) => i.groupId)

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{t.dash.chats.title}</h2>
          <p className="meta">{t.dash.chats.sub}</p>
        </div>
      </div>
      <div className="list-stack">
        {!groups.length ? (
          <div className="empty">{t.dash.chats.empty}</div>
        ) : (
          groups.map((inc) => {
            const msgs = groupChats[inc.groupId] || []
            const team = technicians.filter((tech) => inc.hiredTechIds.includes(tech.id))
            return (
              <Link key={inc.id} to={`/dashboard/incidents/${inc.id}`} className="row-card">
                <div>
                  <h3>
                    {inc.groupId} · {inc.title}
                  </h3>
                  <p className="meta">
                    {msgs.length} messages · last: {msgs[msgs.length - 1]?.text || '—'}
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
                <span className="badge">{t.dash.chats.open}</span>
              </Link>
            )
          })
        )}
      </div>
    </section>
  )
}
