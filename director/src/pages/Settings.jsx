import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { useDirectorData } from '../context/DirectorDataContext'

export default function Settings() {
  const { t } = useLanguage()
  const { settings, saveSettings } = useDirectorData()
  const [form, setForm] = useState({ ...settings })
  const [saved, setSaved] = useState(false)

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function onSubmit(e) {
    e.preventDefault()
    saveSettings({
      approvalThresholdEur: Number(form.approvalThresholdEur),
      reminderDay1: Number(form.reminderDay1),
      reminderDay2: Number(form.reminderDay2),
      companyName: form.companyName,
      aiPricingNote: form.aiPricingNote,
    })
    setSaved(true)
  }

  return (
    <section className="panel" style={{ maxWidth: 640 }}>
      <div className="panel-head">
        <div>
          <h2>{t.dash.settings.title}</h2>
          <p className="meta">{t.dash.settings.sub}</p>
        </div>
      </div>

      <form className="form-grid" onSubmit={onSubmit}>
        <div className="field">
          <label>{t.dash.settings.company}</label>
          <input
            required
            value={form.companyName}
            onChange={(e) => set('companyName', e.target.value)}
          />
        </div>

        <div className="field">
          <label>{t.dash.settings.threshold}</label>
          <input
            required
            type="number"
            min="0"
            step="50"
            value={form.approvalThresholdEur}
            onChange={(e) => set('approvalThresholdEur', e.target.value)}
          />
          <p className="meta" style={{ marginTop: 6 }}>
            {t.dash.settings.thresholdHint}
          </p>
        </div>

        <div className="form-row-2">
          <div className="field">
            <label>{t.dash.settings.rem1}</label>
            <input
              required
              type="number"
              min="1"
              value={form.reminderDay1}
              onChange={(e) => set('reminderDay1', e.target.value)}
            />
          </div>
          <div className="field">
            <label>{t.dash.settings.rem2}</label>
            <input
              required
              type="number"
              min="1"
              value={form.reminderDay2}
              onChange={(e) => set('reminderDay2', e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>{t.dash.settings.aiNote}</label>
          <textarea
            rows={4}
            value={form.aiPricingNote}
            onChange={(e) => set('aiPricingNote', e.target.value)}
          />
        </div>

        <button className="btn btn-primary" type="submit">
          {t.dash.settings.save}
        </button>
        {saved ? <div className="banner ok">{t.dash.settings.saved}</div> : null}
      </form>
    </section>
  )
}
