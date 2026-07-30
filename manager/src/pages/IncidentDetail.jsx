import { Link, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { useManagerData } from '../context/ManagerDataContext'

function formatTime(iso, lang) {
  return new Date(iso).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export default function IncidentDetail() {
  const { id } = useParams()
  const { t, lang } = useLanguage()
  const {
    incidents,
    technicians,
    groupChats,
    threshold,
    user,
    setUrgency,
    hireTechnicians,
    sendGroupMessage,
    approveDevis,
    rejectDevis,
    simulateClientSign,
    planIntervention,
    markInProgress,
    completeAndInvoice,
  } = useManagerData()

  const incident = incidents.find((i) => i.id === id)
  const [urgency, setUrgencyLocal] = useState(incident?.urgency || 'medium')
  const [selected, setSelected] = useState([])
  const [chatText, setChatText] = useState('')
  const [scheduleAt, setScheduleAt] = useState('')

  const mapCenter = useMemo(() => {
    if (!incident) return { lat: 48.8566, lng: 2.3522 }
    return { lat: incident.lat, lng: incident.lng }
  }, [incident])

  if (!incident) {
    return (
      <section className="panel">
        <div className="empty">
          <p>{t.dash.detail.notFound}</p>
          <Link to="/dashboard/incidents" className="btn btn-primary btn-sm">
            {t.dash.detail.back}
          </Link>
        </div>
      </section>
    )
  }

  const hired = technicians.filter((tech) => incident.hiredTechIds.includes(tech.id))
  const chat = incident.groupId ? groupChats[incident.groupId] || [] : []
  const canHire = ['new', 'awaiting_assignment', 'site_visit'].includes(incident.status) && !incident.hiredTechIds.length
  const canApprove = incident.status === 'devis_pending_manager'
  const isDirectorQueue = incident.status === 'devis_pending_director'
  const canPlan = incident.status === 'client_signed'
  const canProgress = incident.status === 'intervention_planned'
  const canComplete = incident.status === 'in_progress'

  function toggleTech(techId, available) {
    if (!available) return
    setSelected((prev) => (prev.includes(techId) ? prev.filter((x) => x !== techId) : [...prev, techId]))
  }

  function onHire() {
    if (!selected.length) return
    hireTechnicians(incident.id, selected)
    setSelected([])
  }

  function onSendChat(e) {
    e.preventDefault()
    if (!chatText.trim() || !incident.groupId) return
    sendGroupMessage(incident.groupId, chatText.trim())
    setChatText('')
  }

  function onPlan(e) {
    e.preventDefault()
    if (!scheduleAt) return
    planIntervention(incident.id, new Date(scheduleAt).toISOString())
  }

  return (
    <>
      <section className="panel" style={{ marginBottom: '1rem' }}>
        <div className="panel-head">
          <div>
            <Link to="/dashboard/incidents" className="meta">
              ← {t.dash.detail.back}
            </Link>
            <h2 style={{ marginTop: 8 }}>{incident.title}</h2>
            <p className="meta">
              {incident.id} · {t.dash.incidents.channels[incident.channel]} · {incident.complainant}
            </p>
            <p className="meta">
              {incident.building} / {incident.unit} · {incident.city}
            </p>
          </div>
          <span className="badge">{t.dash.incidents.statuses[incident.status]}</span>
        </div>
        <div className="banner info">
          <strong>{t.dash.detail.aiFile}:</strong> {incident.aiMatch}
        </div>

        {['new', 'awaiting_assignment'].includes(incident.status) || !incident.urgency ? (
          <div className="form-grid" style={{ maxWidth: 420 }}>
            <div className="field">
              <label>{t.dash.detail.urgency}</label>
              <select value={urgency} onChange={(e) => setUrgencyLocal(e.target.value)}>
                <option value="low">{t.dash.detail.low}</option>
                <option value="medium">{t.dash.detail.medium}</option>
                <option value="high">{t.dash.detail.high}</option>
              </select>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setUrgency(incident.id, urgency)}>
              {t.dash.detail.saveUrgency}
            </button>
          </div>
        ) : (
          <p className="meta">
            {t.dash.detail.urgency}: <strong>{incident.urgency}</strong>
          </p>
        )}
      </section>

      <div className="two-col">
        <div>
          {canHire ? (
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>{t.dash.detail.hireTitle}</h2>
                  <p className="meta">{t.dash.detail.hireSub}</p>
                </div>
              </div>

              <div className="map-frame" style={{ marginBottom: 12 }}>
                <iframe
                  title="tech-map"
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                    mapCenter.lng - 0.04
                  }%2C${mapCenter.lat - 0.03}%2C${mapCenter.lng + 0.04}%2C${
                    mapCenter.lat + 0.03
                  }&layer=mapnik&marker=${mapCenter.lat}%2C${mapCenter.lng}`}
                />
              </div>

              <div className="tech-grid">
                {technicians.map((tech) => (
                  <button
                    type="button"
                    key={tech.id}
                    className={`tech-card${selected.includes(tech.id) ? ' selected' : ''}${
                      !tech.available ? ' disabled' : ''
                    }`}
                    onClick={() => toggleTech(tech.id, tech.available)}
                    disabled={!tech.available}
                  >
                    <img src={tech.photo} alt="" />
                    <h3>{tech.name}</h3>
                    <p className="meta">{tech.specialty}</p>
                    <p className="meta">
                      ★ {tech.rating} · {tech.experienceYears} yrs · {tech.city}
                    </p>
                    <span className={`badge${tech.available ? ' ok' : ' warn'}`}>
                      {tech.available ? t.dash.detail.available : t.dash.detail.busy}
                    </span>
                  </button>
                ))}
              </div>

              <div className="action-row">
                <button type="button" className="btn btn-primary" disabled={!selected.length} onClick={onHire}>
                  {t.dash.detail.hire} ({selected.length})
                </button>
              </div>
            </section>
          ) : null}

          {hired.length ? (
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>{t.dash.detail.hired}</h2>
                  <p className="meta">{incident.groupId}</p>
                </div>
              </div>
              <div className="member-row">
                {hired.map((tech) => (
                  <span className="member-chip" key={tech.id}>
                    <img src={tech.photo} alt="" />
                    {tech.name}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {incident.aiReport ? (
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>{t.dash.detail.report}</h2>
                  <p className="meta">{incident.constat}</p>
                </div>
              </div>
              <p>{incident.aiReport.summary}</p>
              {incident.photos?.length ? (
                <div className="thumb-row">
                  {incident.photos.map((src, i) => (
                    <img className="thumb" key={i} src={src} alt="" />
                  ))}
                </div>
              ) : null}

              {incident.devis ? (
                <>
                  <h3 style={{ marginTop: 14 }}>{t.dash.detail.devis}</h3>
                  <p className="amount">
                    {incident.devis.amount} {incident.devis.currency}
                  </p>
                  <p className="meta">
                    {t.dash.detail.threshold}: {threshold} EUR · route:{' '}
                    {incident.devis.approvalRoute}
                  </p>
                  <ul className="line-items">
                    {incident.devis.lines?.map((line) => (
                      <li key={line.label}>
                        <span>{line.label}</span>
                        <strong>
                          {line.amount} {incident.devis.currency}
                        </strong>
                      </li>
                    ))}
                  </ul>

                  {isDirectorQueue ? (
                    <div className="banner warn">{t.dash.detail.directorNote}</div>
                  ) : null}

                  {canApprove ? (
                    <div className="action-row">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => approveDevis(incident.id)}
                      >
                        {t.dash.detail.approve}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => rejectDevis(incident.id)}
                      >
                        {t.dash.detail.reject}
                      </button>
                    </div>
                  ) : null}

                  {incident.status === 'sent_to_client' ? (
                    <>
                      <div className="banner ok">{t.dash.detail.sentClient}</div>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => simulateClientSign(incident.id)}
                      >
                        {lang === 'fr' ? 'Simuler signature client' : 'Simulate client e-signature'}
                      </button>
                    </>
                  ) : null}
                </>
              ) : null}
            </section>
          ) : null}

          {canPlan || canProgress || canComplete ? (
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>{t.dash.detail.plan}</h2>
                  <p className="meta">{t.dash.detail.planHint}</p>
                </div>
              </div>
              {canPlan ? (
                <form className="form-grid" onSubmit={onPlan} style={{ maxWidth: 360 }}>
                  <div className="field">
                    <label>Date / time</label>
                    <input
                      type="datetime-local"
                      required
                      value={scheduleAt}
                      onChange={(e) => setScheduleAt(e.target.value)}
                    />
                  </div>
                  <button className="btn btn-primary btn-sm" type="submit">
                    {t.dash.detail.plan}
                  </button>
                </form>
              ) : null}
              {canProgress ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => markInProgress(incident.id)}
                >
                  {t.dash.detail.markProgress}
                </button>
              ) : null}
              {canComplete ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => completeAndInvoice(incident.id)}
                >
                  {t.dash.detail.completeInvoice}
                </button>
              ) : null}
              {incident.scheduledAt ? (
                <p className="meta" style={{ marginTop: 10 }}>
                  Scheduled: {formatTime(incident.scheduledAt, lang)}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>

        <section className="panel chat-box">
          <div className="panel-head">
            <div>
              <h2>{t.dash.detail.chat}</h2>
              <p className="meta">
                {incident.groupId || (lang === 'fr' ? 'Groupe après embauche' : 'Group after hire')}
              </p>
            </div>
          </div>
          <div className="chat-stream">
            {!chat.length ? (
              <div className="empty">—</div>
            ) : (
              chat.map((msg) => (
                <div key={msg.id} className={`bubble ${msg.fromId === user.id ? 'me' : 'them'}`}>
                  <strong>{msg.fromName}</strong>
                  {msg.text}
                </div>
              ))
            )}
          </div>
          <form className="chat-compose" onSubmit={onSendChat}>
            <input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder={t.dash.detail.chatPh}
              disabled={!incident.groupId}
            />
            <button className="btn btn-primary btn-sm" type="submit" disabled={!incident.groupId}>
              {t.dash.detail.send}
            </button>
          </form>
        </section>
      </div>
    </>
  )
}
