import { useState } from 'react'
import { useTechData } from '../context/TechDataContext'
import { useLanguage } from '../context/LanguageContext'

export default function Profile() {
  const { t, lang } = useLanguage()
  const { profile, updateProfile } = useTechData()
  const [form, setForm] = useState({
    name: profile.name,
    email: profile.email,
    age: profile.age,
    experienceYears: profile.experienceYears,
    specialty: profile.specialty,
    phone: profile.phone,
    photo: profile.photo,
    city: profile.location.city,
    country: profile.location.country,
    address: profile.location.address,
    lat: profile.location.lat,
    lng: profile.location.lng,
  })
  const [saved, setSaved] = useState(false)
  const [locating, setLocating] = useState(false)

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

  function refreshLocation() {
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
        } finally {
          setLocating(false)
        }
      },
      () => setLocating(false),
    )
  }

  function handleSubmit(e) {
    e.preventDefault()
    updateProfile({
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
        city: form.city,
        country: form.country,
        address: form.address,
      },
    })
    setSaved(true)
  }

  return (
    <section className="panel" style={{ maxWidth: 640 }}>
      <div className="panel-head">
        <div>
          <h2>{t.dash.profile.title}</h2>
          <p className="meta">{t.dash.profile.sub}</p>
        </div>
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="photo-pick">
          <img src={form.photo} alt="" className="profile-photo" />
          <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
            {t.auth.takePhoto}
            <input type="file" accept="image/*" hidden onChange={onPhoto} />
          </label>
        </div>

        <div className="field">
          <label>{t.auth.name}</label>
          <input required value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="form-row-2">
          <div className="field">
            <label>{t.auth.email}</label>
            <input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="field">
            <label>{t.auth.phone}</label>
            <input required value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
        </div>
        <div className="form-row-2">
          <div className="field">
            <label>{t.auth.age}</label>
            <input
              required
              type="number"
              value={form.age}
              onChange={(e) => set('age', e.target.value)}
            />
          </div>
          <div className="field">
            <label>{t.auth.experience}</label>
            <input
              required
              type="number"
              value={form.experienceYears}
              onChange={(e) => set('experienceYears', e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label>{t.auth.specialty}</label>
          <input required value={form.specialty} onChange={(e) => set('specialty', e.target.value)} />
        </div>
        <div className="field">
          <label>{t.auth.location}</label>
          <button type="button" className="locate-btn" onClick={refreshLocation} disabled={locating}>
            {locating ? t.auth.locating : t.dash.profile.refreshLocation}
          </button>
          <p className="meta" style={{ marginTop: 6 }}>
            {form.lat?.toFixed?.(5)}, {form.lng?.toFixed?.(5)}
          </p>
        </div>
        <div className="field">
          <label>{t.auth.address}</label>
          <input required value={form.address} onChange={(e) => set('address', e.target.value)} />
        </div>
        <div className="form-row-2">
          <div className="field">
            <label>{t.auth.city}</label>
            <input required value={form.city} onChange={(e) => set('city', e.target.value)} />
          </div>
          <div className="field">
            <label>{t.auth.country}</label>
            <input required value={form.country} onChange={(e) => set('country', e.target.value)} />
          </div>
        </div>

        <button className="btn btn-primary" type="submit">
          {t.dash.profile.save}
        </button>
        {saved ? <p className="kpi-hint">{t.dash.profile.saved}</p> : null}
        {lang === 'fr' ? null : null}
      </form>
    </section>
  )
}
