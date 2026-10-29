import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import { useClientData } from '../../context/ClientDataContext'
import { useLanguage } from '../../context/LanguageContext'
import { statusLabel } from '../../data/mockData'

function formatTime(iso, lang) {
  try {
    return new Date(iso).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export default function TrackDetail() {
  const { id } = useParams()
  const { t, lang } = useLanguage()
  const { cases, messages, techProfiles, sendMessage } = useClientData()
  const [text, setText] = useState('')

  const item = cases.find((c) => c.id === id)
  const tech = item?.technicianId ? techProfiles[item.technicianId] : null
  const chat = messages[id] || []

  if (!item) {
    return (
      <section className="panel">
        <div className="empty-state">
          <p>{t.dash.track.notFound}</p>
          <Link to="/dashboard/track" className="btn btn-primary btn-sm">
            {t.dash.track.back}
          </Link>
        </div>
      </section>
    )
  }

  function onSend(event) {
    event.preventDefault()
    if (!text.trim() || !tech) return
    sendMessage(id, text.trim())
    setText('')
  }

  return (
    <>
      <section className="panel" style={{ marginBottom: '1rem' }}>
        <div className="panel-head">
          <div>
            <Link to="/dashboard/track" className="back-link">
              ← {t.dash.track.back}
            </Link>
            <h2 className="page-title" style={{ marginTop: '0.55rem' }}>
              {item.title}
            </h2>
            <p className="page-sub">
              {item.id} · {item.buildingAddress}
            </p>
          </div>
          <span className={`badge${tech ? ' ok' : ' warn'}`}>
            {statusLabel(item.status, lang)}
          </span>
        </div>

        {item.images?.length ? (
          <div className="thumb-row">
            {item.images.map((src, i) => (
              <img className="thumb" key={i} src={src} alt="" />
            ))}
          </div>
        ) : null}
        <p className="meta" style={{ marginTop: '0.85rem' }}>
          {item.notes}
        </p>
      </section>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{t.dash.track.techTitle}</h2>
              <p>{t.dash.track.techSub}</p>
            </div>
          </div>

          {!tech ? (
            <div className="status-waiting">{t.dash.track.waitingTech}</div>
          ) : (
            <div className="tech-card">
              <div className="tech-head">
                <img src={tech.avatar} alt="" />
                <div>
                  <h3 style={{ margin: 0 }}>{tech.name}</h3>
                  <p className="meta" style={{ margin: '0.2rem 0' }}>
                    {tech.role} · {tech.specialty}
                  </p>
                  <p className="meta">{tech.phone}</p>
                </div>
              </div>
              <div className="tech-stats">
                <div className="tech-stat">
                  <strong>{tech.rating}</strong>
                  <span>{t.dash.track.rating}</span>
                </div>
                <div className="tech-stat">
                  <strong>{tech.jobs}</strong>
                  <span>{t.dash.track.jobs}</span>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="panel chat-box">
          <div className="panel-head">
            <div>
              <h2>{t.dash.track.chatTitle}</h2>
              <p>{tech ? t.dash.track.chatSub : t.dash.track.chatLocked}</p>
            </div>
          </div>

          <div className="chat-stream">
            {!chat.length ? (
              <div className="empty-state">{t.dash.track.noMessages}</div>
            ) : (
              chat.map((msg) => (
                <div key={msg.id} className={`bubble ${msg.from}`}>
                  {msg.text}
                  <time>{formatTime(msg.at, lang)}</time>
                </div>
              ))
            )}
          </div>

          <form className="chat-compose" onSubmit={onSend}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={tech ? t.dash.track.chatPlaceholder : t.dash.track.chatLocked}
              disabled={!tech}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={!tech || !text.trim()}>
              {t.dash.track.send}
            </button>
          </form>
        </section>
      </div>
    </>
  )
}
