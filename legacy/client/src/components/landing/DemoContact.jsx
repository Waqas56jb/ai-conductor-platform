import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { appLink } from '../../appUrl'
import { useLanguage } from '../../context/LanguageContext'
import { attribution } from '../../track'
import Icon from './icons'
import { Reveal } from './Reveal'
import './demo-contact.css'

const CONTACT_EMAIL = 'contact@pratonna.com'
const EMPTY = { name: '', email: '', phone: '', company: '', sector: '', message: '', website: '' }

const parisDay = (iso, locale) =>
  new Intl.DateTimeFormat(locale, { timeZone: 'Europe/Paris', weekday: 'short', day: 'numeric', month: 'short' }).format(
    new Date(iso),
  )
const parisTime = (iso) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const parisLong = (iso, locale) =>
  new Intl.DateTimeFormat(locale, {
    timeZone: 'Europe/Paris',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))

/** Free demo booking: a real slot in the team's calendar, confirmed by email. */
export default function DemoContact({ defaultSector = '' }) {
  const { t, lang } = useLanguage()
  const s = t.landing.demo
  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB'
  const [form, setForm] = useState({ ...EMPTY, sector: defaultSector })
  const [slots, setSlots] = useState(null) // null: loading, []: none, 'error'
  const [day, setDay] = useState('')
  const [slot, setSlot] = useState('')
  const [consent, setConsent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [booked, setBooked] = useState(null)

  function loadSlots() {
    setSlots(null)
    fetch(appLink('/api/demo/slots'))
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => setSlots(data.slots))
      .catch(() => setSlots('error'))
  }
  useEffect(loadSlots, [])

  // Slots grouped by Paris day, in order.
  const days = useMemo(() => {
    if (!Array.isArray(slots)) return []
    const map = new Map()
    for (const iso of slots) {
      const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date(iso))
      map.set(key, [...(map.get(key) ?? []), iso])
    }
    return [...map]
  }, [slots])
  const activeDay = day || days[0]?.[0] || ''
  const times = days.find(([key]) => key === activeDay)?.[1] ?? []

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    if (!slot) return setError(s.errors.slot)
    setSending(true)
    setError('')
    try {
      const res = await fetch(appLink('/api/demo/requests'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, slot, consent, locale: lang, ...attribution() }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setBooked({ slot: data.slot ?? slot, emailed: Boolean(data.emailed) })
        return
      }
      if (data.error === 'slot_unavailable') {
        setSlot('')
        loadSlots()
        setError(s.errors.taken)
      } else setError(data.error === 'too_many' ? s.errors.tooMany : s.errors.generic)
    } catch {
      setError(s.errors.generic)
    } finally {
      setSending(false)
    }
  }

  return (
    <section id="demo" className="lp-section lp-demo" aria-labelledby="lp-demo-title">
      <div className="lp-container lp-demo__grid">
        <Reveal className="lp-demo__intro">
          <p className="lp-eyebrow">{s.eyebrow}</p>
          <h2 className="lp-title" id="lp-demo-title">
            {s.title}
          </h2>
          <p className="lp-free">
            <Icon name="check" />
            {s.free}
          </p>
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
          {booked ? (
            <div className="lp-booked" role="status">
              <span className="lp-booked__icon">
                <Icon name="checkCircle" />
              </span>
              <h3>{s.done.title}</h3>
              <p>{s.done.text.replace('{slot}', parisLong(booked.slot, locale))}</p>
              <p className="lp-form__privacy">{booked.emailed ? s.done.next : s.done.nextNoEmail}</p>
            </div>
          ) : (
            <form className="lp-form" onSubmit={onSubmit} noValidate={false}>
              <h3>{s.formTitle}</h3>

              <fieldset className="lp-slots">
                <legend>
                  {s.slotTitle} <small>{s.timezone}</small>
                </legend>
                {slots === null ? <p className="lp-slots__note">{s.slotLoading}</p> : null}
                {slots === 'error' ? (
                  <p className="lp-slots__note">
                    {s.slotError}{' '}
                    <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(s.mailSubject)}`}>{CONTACT_EMAIL}</a>
                  </p>
                ) : null}
                {Array.isArray(slots) && !slots.length ? <p className="lp-slots__note">{s.noSlots}</p> : null}
                {days.length ? (
                  <>
                    <div className="lp-slots__days" role="radiogroup" aria-label={s.dayLabel}>
                      {days.map(([key, list]) => (
                        <button
                          type="button"
                          key={key}
                          role="radio"
                          aria-checked={key === activeDay}
                          className={key === activeDay ? 'is-active' : ''}
                          onClick={() => {
                            setDay(key)
                            setSlot('')
                          }}
                        >
                          {parisDay(list[0], locale)}
                        </button>
                      ))}
                    </div>
                    <div className="lp-slots__times" role="radiogroup" aria-label={s.timeLabel}>
                      {times.map((iso) => (
                        <button
                          type="button"
                          key={iso}
                          role="radio"
                          aria-checked={iso === slot}
                          className={iso === slot ? 'is-active' : ''}
                          onClick={() => setSlot(iso)}
                        >
                          {parisTime(iso)}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </fieldset>

              <div className="lp-form__row">
                <label className="lp-field">
                  <span>{s.name}</span>
                  <input required minLength={2} autoComplete="name" value={form.name} onChange={set('name')} />
                </label>
                <label className="lp-field">
                  <span>{s.email}</span>
                  <input required type="email" autoComplete="email" value={form.email} onChange={set('email')} />
                </label>
              </div>
              <div className="lp-form__row">
                <label className="lp-field">
                  <span>
                    {s.phone} <small>({s.optional})</small>
                  </span>
                  <input type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
                </label>
                <label className="lp-field">
                  <span>{s.company}</span>
                  <input required autoComplete="organization" value={form.company} onChange={set('company')} />
                </label>
              </div>
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
              <label className="lp-field">
                <span>
                  {s.message} <small>({s.optional})</small>
                </span>
                <textarea rows={3} placeholder={s.messagePlaceholder} value={form.message} onChange={set('message')} />
              </label>
              {/* Honeypot: hidden from people, filled by bots. */}
              <label className="lp-hp" aria-hidden="true">
                Website
                <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
              </label>
              <label className="lp-consent">
                <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>
                  {s.consent} <Link to="/confidentialite">{s.privacyLink}</Link>
                </span>
              </label>
              {error ? (
                <p className="lp-form__error" role="alert">
                  {error}
                </p>
              ) : null}
              <button type="submit" className="ai-btn ai-btn--primary ai-btn--block" disabled={sending}>
                {sending ? s.sending : s.submit}
                <Icon name="arrow" />
              </button>
              <p className="lp-form__privacy">{s.privacy}</p>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  )
}
