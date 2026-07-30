import { Link } from 'react-router-dom'
import { useTechData } from '../context/TechDataContext'
import { useLanguage } from '../context/LanguageContext'

export default function Tasks() {
  const { t } = useLanguage()
  const { tasks, peerTechnicians, profile } = useTechData()

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{t.dash.tasks.title}</h2>
          <p className="meta">{t.dash.tasks.sub}</p>
        </div>
      </div>

      {!tasks.length ? (
        <div className="empty">{t.dash.tasks.empty}</div>
      ) : (
        <div className="list-stack">
          {tasks.map((task) => {
            const members = task.hiredTechIds.map((id) =>
              id === profile.id
                ? { id, name: profile.name, photo: profile.photo }
                : peerTechnicians[id],
            )
            return (
              <Link key={task.id} to={`/dashboard/tasks/${task.id}`} className="row-card">
                <div>
                  <h3>{task.title}</h3>
                  <p className="meta">
                    {task.id} · {t.dash.tasks.group} {task.groupId} · {task.buildingAddress}
                  </p>
                  <div className="member-row" style={{ marginTop: 8 }}>
                    {members.filter(Boolean).map((m) => (
                      <span className="member-chip" key={m.id}>
                        <img src={m.photo} alt="" />
                        {m.name}
                      </span>
                    ))}
                  </div>
                </div>
                <span
                  className={`badge${
                    task.stage === 'completed'
                      ? ' ok'
                      : task.stage === 'site_visit'
                        ? ' warn'
                        : ''
                  }`}
                >
                  {t.dash.tasks.stages[task.stage]}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
