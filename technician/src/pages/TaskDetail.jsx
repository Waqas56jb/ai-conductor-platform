import { Link, useParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useTechData } from '../context/TechDataContext'
import { useLanguage } from '../context/LanguageContext'

function formatTime(iso, lang) {
  return new Date(iso).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export default function TaskDetail() {
  const { id } = useParams()
  const { t, lang } = useLanguage()
  const {
    tasks,
    profile,
    peerTechnicians,
    groupMessages,
    threshold,
    sendGroupMessage,
    submitSiteReport,
    simulateClientSignedAssignment,
    startWork,
    completeWork,
  } = useTechData()

  const task = tasks.find((item) => item.id === id)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const galleryRef = useRef(null)
  const streamRef = useRef(null)

  const [cameraOn, setCameraOn] = useState(false)
  const [photos, setPhotos] = useState([])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [chatText, setChatText] = useState('')

  useEffect(() => {
    if (task) {
      setPhotos(task.photos || [])
      setNotes(task.notes || '')
    }
    return () => stopCamera()
  }, [task?.id])

  if (!task) {
    return (
      <section className="panel">
        <div className="empty">
          <p>{t.dash.task.notFound}</p>
          <Link to="/dashboard/tasks" className="btn btn-primary btn-sm">
            {t.dash.task.back}
          </Link>
        </div>
      </section>
    )
  }

  const members = task.hiredTechIds.map((tid) =>
    tid === profile.id
      ? { id: tid, name: profile.name, photo: profile.photo }
      : peerTechnicians[tid],
  )
  const chat = groupMessages[task.groupId] || []
  const canSiteVisit = task.stage === 'site_visit'
  const canIntervene = ['intervention_assigned', 'in_progress'].includes(task.stage)

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
      setError(t.dash.task.cameraError)
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((tr) => tr.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
  }

  function capture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    setPhotos((prev) => [...prev, canvas.toDataURL('image/jpeg', 0.9)])
  }

  function onGallery(e) {
    Array.from(e.target.files || []).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => setPhotos((prev) => [...prev, String(reader.result)])
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  async function onGenerate(e) {
    e.preventDefault()
    setError('')
    if (!photos.length) return setError(t.dash.task.needPhoto)
    if (!notes.trim()) return setError(t.dash.task.needNotes)
    setGenerating(true)
    await new Promise((r) => setTimeout(r, 900))
    submitSiteReport(task.id, { photos, notes: notes.trim() })
    stopCamera()
    setGenerating(false)
  }

  function onSendChat(e) {
    e.preventDefault()
    if (!chatText.trim()) return
    sendGroupMessage(task.groupId, chatText.trim())
    setChatText('')
  }

  return (
    <>
      <section className="panel" style={{ marginBottom: '1rem' }}>
        <div className="panel-head">
          <div>
            <Link to="/dashboard/tasks" className="meta">
              ← {t.dash.task.back}
            </Link>
            <h2 style={{ marginTop: 8 }}>{task.title}</h2>
            <p className="meta">
              {task.id} · {task.caseId} · {task.buildingAddress}
            </p>
          </div>
          <span className="badge">{t.dash.tasks.stages[task.stage]}</span>
        </div>

        <p className="meta" style={{ marginBottom: 8 }}>
          {t.dash.tasks.members}
        </p>
        <div className="member-row">
          {members.filter(Boolean).map((m) => (
            <span className="member-chip" key={m.id}>
              <img src={m.photo} alt="" />
              {m.name}
            </span>
          ))}
        </div>

        {task.assignedAfterClientSign && task.stage !== 'completed' ? (
          <div className="banner ok" style={{ marginTop: 14 }}>
            {t.dash.task.assignedBanner}
          </div>
        ) : null}
        {['awaiting_approval', 'awaiting_client_sign', 'report_sent'].includes(task.stage) ? (
          <div className="banner warn" style={{ marginTop: 14 }}>
            {t.dash.task.awaitingBanner}
          </div>
        ) : null}
      </section>

      <div className="two-col">
        <div>
          {canSiteVisit ? (
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>{t.dash.task.siteTitle}</h2>
                  <p className="meta">{t.dash.task.siteSub}</p>
                </div>
              </div>

              <div className="camera-box">
                {cameraOn ? (
                  <video ref={videoRef} playsInline muted autoPlay />
                ) : photos[0] ? (
                  <img src={photos[0]} alt="" />
                ) : (
                  <div className="empty" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Camera
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} hidden />

              <div className="camera-actions">
                {!cameraOn ? (
                  <button type="button" className="btn btn-primary btn-sm" onClick={startCamera}>
                    {t.dash.task.openCamera}
                  </button>
                ) : (
                  <>
                    <button type="button" className="btn btn-primary btn-sm" onClick={capture}>
                      {t.dash.task.capture}
                    </button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={stopCamera}>
                      {t.dash.task.closeCamera}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => galleryRef.current?.click()}
                >
                  {t.dash.task.gallery}
                </button>
                <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={onGallery} />
              </div>

              {photos.length ? (
                <div className="thumb-row">
                  {photos.map((src, i) => (
                    <img className="thumb" key={i} src={src} alt="" />
                  ))}
                </div>
              ) : null}

              <form className="form-grid" style={{ marginTop: 14 }} onSubmit={onGenerate}>
                <div className="field">
                  <label htmlFor="notes">{t.dash.task.notes}</label>
                  <textarea
                    id="notes"
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t.dash.task.notesPh}
                  />
                </div>
                {error ? <p className="form-error">{error}</p> : null}
                <button className="btn btn-primary" type="submit" disabled={generating}>
                  {generating ? t.dash.task.generating : t.dash.task.generate}
                </button>
              </form>
            </section>
          ) : null}

          {task.aiReport ? (
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>{t.dash.task.reportTitle}</h2>
                  <p className="meta">{t.dash.task.sent}</p>
                </div>
              </div>
              <p>{task.aiReport.summary}</p>
              {task.devis ? (
                <>
                  <p className="amount">
                    {task.devis.amount} {task.devis.currency}
                  </p>
                  <p className="meta">
                    {t.dash.task.threshold}: {threshold} EUR ·{' '}
                    {task.devis.approvalRoute === 'director'
                      ? t.dash.task.routeDirector
                      : t.dash.task.routeManager}
                  </p>
                  {task.stage === 'awaiting_approval' ? (
                    <div className="action-row">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => simulateClientSignedAssignment(task.id)}
                      >
                        {lang === 'fr'
                          ? 'Simuler validation + signature client'
                          : 'Simulate approval + client signature'}
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null}
              {task.photos?.length ? (
                <div className="thumb-row">
                  {task.photos.map((src, i) => (
                    <img className="thumb" key={i} src={src} alt="" />
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {canIntervene ? (
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>{t.dash.task.intervention}</h2>
                  <p className="meta">{t.dash.task.completeHint}</p>
                </div>
              </div>
              <div className="action-row">
                {task.stage === 'intervention_assigned' ? (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => startWork(task.id)}>
                    {t.dash.task.startWork}
                  </button>
                ) : null}
                {task.stage === 'in_progress' ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => completeWork(task.id)}
                  >
                    {t.dash.task.completeWork}
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}

          {task.stage === 'completed' ? (
            <div className="banner ok">{t.dash.tasks.stages.completed} — invoice → client</div>
          ) : null}
        </div>

        <section className="panel chat-box">
          <div className="panel-head">
            <div>
              <h2>{t.dash.task.chatTitle}</h2>
              <p className="meta">{t.dash.task.chatSub}</p>
            </div>
          </div>
          <div className="chat-stream">
            {!chat.length ? (
              <div className="empty">—</div>
            ) : (
              chat.map((msg) => (
                <div key={msg.id} className={`bubble ${msg.fromId === profile.id ? 'me' : 'them'}`}>
                  <strong>{msg.fromName}</strong>
                  {msg.text}
                  <time>{formatTime(msg.at, lang)}</time>
                </div>
              ))
            )}
          </div>
          <form className="chat-compose" onSubmit={onSendChat}>
            <input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder={t.dash.task.chatPh}
            />
            <button className="btn btn-primary btn-sm" type="submit">
              {t.dash.task.send}
            </button>
          </form>
        </section>
      </div>
    </>
  )
}
