import { useEffect, useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import Icon from './icons'
import { Reveal } from './Reveal'
import './demo-contact.css'

const CONTACT_EMAIL = 'contact@pratonna.com'
const EMPTY = { name: '', email: '', company: '', sector: '', message: '' }
const TOAST_MS = 7000

export default function DemoContact() {
  const { t } = useLanguage()
  const s = t.landing.demo
  const [form, setForm] = useState(EMPTY)
  const [toast, setToast] = useState(false)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(false), TOAST_MS)
    return () => clearTimeout(id)
  }, [toast])

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  // No backend yet: hand the request to the visitor's email app.
  function onSubmit(e) {
    e.preventDefault()
    const subject = `${s.mailSubject} — ${form.company}`
    const body = [
      `${s.name} : ${form.name}`,
      `${s.email} : ${form.email}`,
      `${s.company} : ${form.company}`,
      `${s.sector} : ${form.sector}`,
      '',
      form.message,
    ].join('\n')
    const link = document.createElement('a')
    link.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    link.click()
    setToast(true)
  }

  return (
    <section id="demo" className="lp-section lp-demo" aria-labelledby="lp-demo-title">
      <div className="lp-container lp-demo__grid">
        <Reveal className="lp-demo__intro">
          <p className="lp-eyebrow">{s.eyebrow}</p>
          <h2 className="lp-title" id="lp-demo-title">
            {s.title}
          </h2>
          <p className="lp-sub">{s.sub}</p>
          <ul className="lp-checklist lp-demo__points">
            {s.points.map((point) => (
              <li key={point}>
                <Icon name="check" />
                {point}
              </li>
            ))}
          </ul>
          <p className="lp-demo__direct">
            {s.direct}{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>
              <Icon name="mail" />
              {CONTACT_EMAIL}
            </a>
          </p>
        </Reveal>

        <Reveal delay={120} id="contact" className="lp-card lp-gborder lp-demo__card">
          <form className="lp-form" onSubmit={onSubmit}>
            <h3>{s.formTitle}</h3>
            <div className="lp-form__row">
              <label className="lp-field">
                <span>{s.name}</span>
                <input required autoComplete="name" value={form.name} onChange={set('name')} />
              </label>
              <label className="lp-field">
                <span>{s.email}</span>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={set('email')}
                />
              </label>
            </div>
            <div className="lp-form__row">
              <label className="lp-field">
                <span>{s.company}</span>
                <input
                  required
                  autoComplete="organization"
                  value={form.company}
                  onChange={set('company')}
                />
              </label>
              <label className="lp-field">
                <span>{s.sector}</span>
                <select required value={form.sector} onChange={set('sector')}>
                  <option value="" disabled>
                    {s.sectorPlaceholder}
                  </option>
                  {s.sectors.map((sector) => (
                    <option key={sector} value={sector}>
                      {sector}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="lp-field">
              <span>
                {s.message} <small>({s.optional})</small>
              </span>
              <textarea
                rows={4}
                placeholder={s.messagePlaceholder}
                value={form.message}
                onChange={set('message')}
              />
            </label>
            <button type="submit" className="ai-btn ai-btn--primary ai-btn--block">
              {s.submit}
              <Icon name="arrow" />
            </button>
            <p className="lp-form__privacy">{s.privacy}</p>
          </form>
        </Reveal>
      </div>

      <div className={`lp-toast${toast ? ' is-visible' : ''}`} role="status" aria-live="polite">
        {toast ? (
          <>
            <span className="lp-toast__icon">
              <Icon name="checkCircle" />
            </span>
            <div>
              <strong>{s.toastTitle}</strong>
              <p>{s.toastText}</p>
            </div>
            <button type="button" className="lp-toast__close" aria-label={s.close} onClick={() => setToast(false)}>
              <Icon name="x" />
            </button>
          </>
        ) : null}
      </div>
    </section>
  )
}
