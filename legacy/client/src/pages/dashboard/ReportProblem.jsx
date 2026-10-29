import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientData } from '../../context/ClientDataContext'
import { useLanguage } from '../../context/LanguageContext'

export default function ReportProblem() {
  const { t } = useLanguage()
  const { addCase } = useClientData()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const galleryRef = useRef(null)
  const streamRef = useRef(null)

  const [cameraOn, setCameraOn] = useState(false)
  const [images, setImages] = useState([])
  const [title, setTitle] = useState('')
  const [buildingAddress, setBuildingAddress] = useState('')
  const [city, setCity] = useState('')
  const [urgency, setUrgency] = useState('medium')
  const [error, setError] = useState('')

  useEffect(() => {
    return () => stopCamera()
  }, [])

  async function startCamera() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraOn(true)
    } catch {
      setError(t.dash.report.cameraError)
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
  }

  function capturePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setImages((prev) => [...prev, dataUrl])
  }

  function onGalleryChange(event) {
    const files = Array.from(event.target.files || [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        setImages((prev) => [...prev, String(reader.result)])
      }
      reader.readAsDataURL(file)
    })
    event.target.value = ''
  }

  function removeImage(index) {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!images.length) {
      setError(t.dash.report.needPhoto)
      return
    }
    if (!buildingAddress.trim()) {
      setError(t.dash.report.needAddress)
      return
    }
    const created = addCase({
      title: title.trim() || t.dash.report.defaultTitle,
      buildingAddress: buildingAddress.trim(),
      city: city.trim(),
      urgency,
      images,
    })
    stopCamera()
    navigate(`/dashboard/track/${created.id}`)
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2 className="page-title">{t.dash.report.title}</h2>
          <p className="page-sub">{t.dash.report.sub}</p>
        </div>
      </div>

      <form className="report-grid" onSubmit={handleSubmit}>
        <div>
          <div className="camera-box">
            {cameraOn ? (
              <video ref={videoRef} playsInline muted autoPlay />
            ) : images[0] ? (
              <img className="preview" src={images[0]} alt="" />
            ) : (
              <div className="empty-state" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {t.dash.report.cameraPlaceholder}
              </div>
            )}
          </div>
          <canvas ref={canvasRef} hidden />

          <div className="camera-actions">
            {!cameraOn ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={startCamera}>
                {t.dash.report.openCamera}
              </button>
            ) : (
              <>
                <button type="button" className="btn btn-primary btn-sm" onClick={capturePhoto}>
                  {t.dash.report.capture}
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={stopCamera}>
                  {t.dash.report.closeCamera}
                </button>
              </>
            )}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => galleryRef.current?.click()}
            >
              {t.dash.report.gallery}
            </button>
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={onGalleryChange}
            />
          </div>

          {images.length ? (
            <div className="thumb-row">
              {images.map((src, index) => (
                <button
                  type="button"
                  key={`${index}-${src.slice(0, 24)}`}
                  onClick={() => removeImage(index)}
                  title={t.dash.report.remove}
                  style={{ border: 0, padding: 0, background: 'transparent', cursor: 'pointer' }}
                >
                  <img className="thumb" src={src} alt="" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="issue-title">{t.dash.report.issueTitle}</label>
            <input
              id="issue-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.dash.report.issuePlaceholder}
            />
          </div>
          <div className="field">
            <label htmlFor="building">{t.dash.report.building}</label>
            <input
              id="building"
              required
              value={buildingAddress}
              onChange={(e) => setBuildingAddress(e.target.value)}
              placeholder={t.dash.report.buildingPlaceholder}
            />
          </div>
          <div className="form-row-2">
            <div className="field">
              <label htmlFor="city">{t.dash.report.city}</label>
              <input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="urgency">{t.dash.report.urgency}</label>
              <select
                id="urgency"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  padding: '0.8rem 0.9rem',
                  background: '#fff',
                }}
              >
                <option value="low">{t.dash.report.urgencyLow}</option>
                <option value="medium">{t.dash.report.urgencyMedium}</option>
                <option value="high">{t.dash.report.urgencyHigh}</option>
              </select>
            </div>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" className="btn btn-primary btn-full">
            {t.dash.report.submit}
          </button>
          <p className="meta">{t.dash.report.hint}</p>
        </div>
      </form>
    </section>
  )
}
