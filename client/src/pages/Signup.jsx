import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'

const AUTH_IMG =
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1400&q=80'

const initialForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  address: '',
  city: '',
  country: '',
}

export default function Signup() {
  const { t, lang, toggleLang } = useLanguage()
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState('')

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function fillFromCoords(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error('reverse geocode failed')
    const data = await res.json()
    const a = data.address || {}

    const road = [a.house_number, a.road].filter(Boolean).join(' ')
    const address =
      road ||
      a.neighbourhood ||
      a.suburb ||
      a.village ||
      data.display_name ||
      ''
    const city = a.city || a.town || a.village || a.municipality || a.county || ''
    const country = a.country || ''

    setForm((prev) => ({
      ...prev,
      address: address || prev.address,
      city: city || prev.city,
      country: country || prev.country,
    }))
  }

  function useLiveLocation() {
    setLocateError('')
    if (!navigator.geolocation) {
      setLocateError(t.signup.locateError)
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await fillFromCoords(pos.coords.latitude, pos.coords.longitude)
        } catch {
          setLocateError(t.signup.locateError)
        } finally {
          setLocating(false)
        }
      },
      () => {
        setLocateError(t.signup.locateError)
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 12000 },
    )
  }

  function handleSubmit(event) {
    event.preventDefault()
    navigate('/dashboard')
  }

  return (
    <div className="auth-page">
      <aside className="auth-visual">
        <img src={AUTH_IMG} alt="" />
        <div className="auth-visual-overlay">
          <h1>{t.brand}</h1>
          <p>{t.footer.tagline}</p>
        </div>
      </aside>

      <main className="auth-panel">
        <div className="auth-card">
          <div className="auth-top">
            <Link to="/" className="back-link">
              ← {t.signup.back}
            </Link>
            <button type="button" className="lang-toggle" onClick={toggleLang}>
              <span className={lang === 'en' ? 'active' : ''}>EN</span>
              {' / '}
              <span className={lang === 'fr' ? 'active' : ''}>FR</span>
            </button>
          </div>

          <h2>{t.signup.title}</h2>
          <p>{t.signup.sub}</p>

          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">{t.signup.name}</label>
              <input
                id="name"
                required
                autoComplete="name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="email">{t.signup.email}</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
            </div>

            <div className="form-row-2">
              <div className="field">
                <label htmlFor="phone">{t.signup.phone}</label>
                <input
                  id="phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="password">{t.signup.password}</label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="address">{t.signup.address}</label>
              <input
                id="address"
                required
                autoComplete="street-address"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
              />
              <button
                type="button"
                className="locate-btn"
                onClick={useLiveLocation}
                disabled={locating}
              >
                {locating ? t.signup.locating : t.signup.locate}
              </button>
              {locateError ? <p className="form-error">{locateError}</p> : null}
            </div>

            <div className="form-row-2">
              <div className="field">
                <label htmlFor="city">{t.signup.city}</label>
                <input
                  id="city"
                  required
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="country">{t.signup.country}</label>
                <input
                  id="country"
                  required
                  autoComplete="country-name"
                  value={form.country}
                  onChange={(e) => updateField('country', e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full">
              {t.signup.submit}
            </button>
          </form>

          <p className="auth-switch">
            {t.signup.hasAccount} <Link to="/login">{t.signup.loginLink}</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
