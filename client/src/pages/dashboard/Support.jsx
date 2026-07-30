import { useState } from 'react'
import { useClientData } from '../../context/ClientDataContext'
import { useLanguage } from '../../context/LanguageContext'

export default function Support() {
  const { t } = useLanguage()
  const { submitFeedback, feedback } = useClientData()
  const [rating, setRating] = useState(5)
  const [message, setMessage] = useState('')
  const [topic, setTopic] = useState('service')
  const [sent, setSent] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    if (!message.trim()) return
    submitFeedback({ rating, message: message.trim(), topic })
    setMessage('')
    setSent(true)
  }

  return (
    <div className="two-col">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2 className="page-title">{t.dash.support.title}</h2>
            <p className="page-sub">{t.dash.support.sub}</p>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="topic">{t.dash.support.topic}</label>
            <select
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={{
                width: '100%',
                border: '1px solid var(--line)',
                borderRadius: 12,
                padding: '0.8rem 0.9rem',
                background: '#fff',
              }}
            >
              <option value="service">{t.dash.support.topics.service}</option>
              <option value="technician">{t.dash.support.topics.technician}</option>
              <option value="billing">{t.dash.support.topics.billing}</option>
              <option value="app">{t.dash.support.topics.app}</option>
            </select>
          </div>

          <div>
            <label style={{ fontWeight: 600, color: 'var(--blue-900)', fontSize: '0.85rem' }}>
              {t.dash.support.rating}
            </label>
            <div className="stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`star-btn${rating >= n ? ' on' : ''}`}
                  onClick={() => setRating(n)}
                  aria-label={`${n}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="feedback">{t.dash.support.message}</label>
            <textarea
              id="feedback"
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{
                width: '100%',
                border: '1px solid var(--line)',
                borderRadius: 12,
                padding: '0.8rem 0.9rem',
                resize: 'vertical',
                font: 'inherit',
              }}
            />
          </div>

          <button type="submit" className="btn btn-primary">
            {t.dash.support.submit}
          </button>
          {sent ? <p className="kpi-hint">{t.dash.support.thanks}</p> : null}
        </form>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{t.dash.support.history}</h2>
            <p>{t.dash.support.historySub}</p>
          </div>
        </div>
        <div className="list-stack">
          {!feedback.length ? (
            <div className="empty-state">{t.dash.support.empty}</div>
          ) : (
            feedback.map((item) => (
              <article key={item.id} className="case-row" style={{ cursor: 'default' }}>
                <div>
                  <h3>
                    {'★'.repeat(item.rating)}
                    {'☆'.repeat(5 - item.rating)} · {item.topic}
                  </h3>
                  <p className="meta">{item.message}</p>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
