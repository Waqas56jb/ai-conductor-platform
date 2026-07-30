import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { useTechData } from '../context/TechDataContext'

const IMG =
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1400&q=80'

const initial = {
  name: '',
  email: '',
  password: '',
  age: '',
  experienceYears: '',
  specialty: '',
  phone: '',
  photo: '',
  city: '',
  country: '',
  address: '',
  lat: null,
  lng: null,
}

export default function Signup() {
  const { t, lang, toggleLang } = useLanguage()
  const { registerProfile } = useTechData()
  const navigate = useNavigate()
  const [form, setForm] = useState(initial)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function onPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => set('photo', String(reader.result))
    reader.readAsDataURL(file)
  }

  async function fetchLocation() {
    setError('')
    if (!navigator.geolocation) {
      setError(t.auth.locateError)
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
            { headers: { Accept: 'application/json' } },
          )
          const data = await res.json()
          const a = data.address || {}
          setForm((prev) => ({
            ...prev,
            lat,
            lng,
            city: a.city || a.town || a.village || prev.city,
            country: a.country || prev.country,
            address: data.display_name || prev.address,
          }))
        } catch {
          setForm((prev) => ({ ...prev, lat, lng }))
          setError(t.auth.locateError)
        } finally {
          setLocating(false)
        }
      },
      () => {
        setError(t.auth.locateError)
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 12000 },
    )
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.photo) {
      setError(lang === 'fr' ? 'Ajoutez une photo de profil.' : 'Add a profile photo.')
      return
    }
    if (form.lat == null || form.lng == null) {
      setError(lang === 'fr' ? 'Récupérez votre position live.' : 'Fetch your live location.')
      return
    }
    registerProfile({
      name: form.name,
      email: form.email,
      age: Number(form.age),
      experienceYears: Number(form.experienceYears),
      specialty: form.specialty,
      phone: form.phone,
      photo: form.photo,
      location: {
        lat: form.lat,
        lng: form.lng,
        address: form.address,
        city: form.city,
        country: form.country,
      },
    })
    navigate('/dashboard')
  }

  return (
    <div className="auth-page">
      <aside className="auth-visual">
        <img src={IMG} alt="" />
        <div className="auth-visual-overlay">
          <h1>{t.brand}</h1>
          <p>{t.auth.signupSub}</p>
        </div>
      </aside>
      <main className="auth-panel">
        <div className="auth-card">
          <div className="auth-top">
            <Link to="/login" className="meta">
              ← {t.auth.loginLink}
            </Link>
            <button type="button" className="lang-toggle" onClick={toggleLang}>
              <span className={lang === 'en' ? 'active' : ''}>EN</span>
              {' / '}
              <span className={lang === 'fr' ? 'active' : ''}>FR</span>
            </button>
          </div>
          <h2>{t.auth.signupTitle}</h2>
          <p>{t.auth.signupSub}</p>

          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="field">
              <label>{t.auth.photo}</label>
              <div className="photo-pick">
                {form.photo ? <img src={form.photo} alt="" /> : <div className="profile-photo" />}
                <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                  {t.auth.takePhoto}
                  <input type="file" accept="image/*" capture="user" hidden onChange={onPhoto} />
                </label>
              </div>
            </div>

            <div className="field">
              <label htmlFor="name">{t.auth.name}</label>
              <input id="name" required value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="form-row-2">
              <div className="field">
                <label htmlFor="email">{t.auth.email}</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="password">{t.auth.password}</label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                />
              </div>
            </div>
            <div className="form-row-2">
              <div className="field">
                <label htmlFor="age">{t.auth.age}</label>
                <input
                  id="age"
                  type="number"
                  min="18"
                  max="80"
                  required
                  value={form.age}
                  onChange={(e) => set('age', e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="exp">{t.auth.experience}</label>
                <input
                  id="exp"
                  type="number"
                  min="0"
                  max="50"
                  required
                  value={form.experienceYears}
                  onChange={(e) => set('experienceYears', e.target.value)}
                />
              </div>
            </div>
            <div className="form-row-2">
              <div className="field">
                <label htmlFor="specialty">{t.auth.specialty}</label>
                <input
                  id="specialty"
                  required
                  value={form.specialty}
                  onChange={(e) => set('specialty', e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="phone">{t.auth.phone}</label>
                <input id="phone" required value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
            </div>

            <div className="field">
              <label>{t.auth.location}</label>
              <button type="button" className="locate-btn" onClick={fetchLocation} disabled={locating}>
                {locating ? t.auth.locating : t.auth.useLocation}
              </button>
              {form.lat != null ? (
                <p className="meta" style={{ marginTop: 6 }}>
                  {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
                </p>
              ) : null}
            </div>
            <div className="field">
              <label htmlFor="address">{t.auth.address}</label>
              <input id="address" required value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div className="form-row-2">
              <div className="field">
                <label htmlFor="city">{t.auth.city}</label>
                <input id="city" required value={form.city} onChange={(e) => set('city', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="country">{t.auth.country}</label>
                <input
                  id="country"
                  required
                  value={form.country}
                  onChange={(e) => set('country', e.target.value)}
                />
              </div>
            </div>

            {error ? <p className="form-error">{error}</p> : null}
            <button className="btn btn-primary btn-full" type="submit">
              {t.auth.signup}
            </button>
          </form>
          <p className="auth-switch">
            {t.auth.hasAccount} <Link to="/login">{t.auth.loginLink}</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
