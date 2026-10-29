import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useManagerData } from '../context/ManagerDataContext'

export default function Approvals() {
  const { t } = useLanguage()
  const { incidents, threshold, approveDevis, rejectDevis } = useManagerData()

  const managerQueue = incidents.filter((i) => i.status === 'devis_pending_manager')
  const directorQueue = incidents.filter((i) => i.status === 'devis_pending_director')

  return (
    <div className="two-col">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{t.dash.approvals.managerQueue}</h2>
            <p className="meta">
              {t.dash.approvals.sub} ({threshold} EUR)
            </p>
          </div>
        </div>
        <div className="list-stack">
          {!managerQueue.length ? (
            <div className="empty">{t.dash.approvals.empty}</div>
          ) : (
            managerQueue.map((inc) => (
              <article key={inc.id} className="row-card" style={{ cursor: 'default', alignItems: 'start' }}>
                <div style={{ width: '100%' }}>
                  <h3>{inc.title}</h3>
                  <p className="meta">
                    {inc.id} · {inc.devis?.amount} {inc.devis?.currency}
                  </p>
                  <p className="meta">{inc.aiReport?.summary}</p>
                  <div className="action-row">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => approveDevis(inc.id)}
                    >
                      {t.dash.detail.approve}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => rejectDevis(inc.id)}
                    >
                      {t.dash.detail.reject}
                    </button>
                    <Link to={`/dashboard/incidents/${inc.id}`} className="btn btn-outline btn-sm">
                      {t.dash.overview.open}
                    </Link>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{t.dash.approvals.directorQueue}</h2>
            <p className="meta">{t.dash.detail.directorNote}</p>
          </div>
        </div>
        <div className="list-stack">
          {!directorQueue.length ? (
            <div className="empty">{t.dash.approvals.empty}</div>
          ) : (
            directorQueue.map((inc) => (
              <Link key={inc.id} to={`/dashboard/incidents/${inc.id}`} className="row-card">
                <div>
                  <h3>{inc.title}</h3>
                  <p className="meta">
                    {inc.id} · {inc.devis?.amount} {inc.devis?.currency}
                  </p>
                </div>
                <span className="badge danger">{t.dash.incidents.statuses[inc.status]}</span>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
