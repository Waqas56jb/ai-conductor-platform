import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import './hero.css'

const VIDEO_SRC = '/final-web.mp4'
const POSTER_SRC = '/final-poster.jpg'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// Turns "a **b** c" into ["a ", <strong>b</strong>, " c"].
function renderBold(text) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part))
}

const Icon = {
  arrow: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  soundOn: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  ),
  soundOff: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M17 9.5l5 5M22 9.5l-5 5" />
    </svg>
  ),
  expand: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  ),
  play: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  building: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 21V5l8-2v18M12 21V9l8 3v9M3 21h18" />
      <path d="M7 8h2M7 12h2M7 16h2M15 14h2M15 17h2" />
    </svg>
  ),
  plug: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0V8zM12 17v4" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
}

const TRUST_ICONS = [Icon.shield, Icon.building, Icon.plug, Icon.clock]

export default function Hero() {
  const { t } = useLanguage()
  const h = t.hero
  const videoRef = useRef(null)
  const barRef = useRef(null)
  const [autoPlay] = useState(() => !prefersReducedMotion())
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    // React does not reliably reflect the `muted` attribute, and browsers only
    // allow autoplay for muted video, so force it on the element.
    video.muted = true
    if (!autoPlay) return

    let removeRetry = () => {}
    video.play().catch(() => {
      // Autoplay blocked (e.g. low-power mode): start on the first interaction.
      const retry = () => video.play().catch(() => {})
      document.addEventListener('pointerdown', retry, { once: true })
      removeRetry = () => document.removeEventListener('pointerdown', retry)
    })
    return () => removeRetry()
  }, [autoPlay])

  function onTimeUpdate() {
    const video = videoRef.current
    if (!video?.duration || !barRef.current) return
    barRef.current.style.transform = `scaleX(${video.currentTime / video.duration})`
  }

  function togglePlay() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) video.play().catch(() => {})
    else video.pause()
  }

  function toggleSound() {
    const video = videoRef.current
    if (!video) return
    if (video.muted) {
      video.muted = false
      video.currentTime = 0
      video.play().catch(() => {})
    } else {
      video.muted = true
    }
  }

  function enterFullscreen() {
    const video = videoRef.current
    if (!video) return
    if (document.fullscreenElement) document.exitFullscreen()
    else if (video.requestFullscreen) video.requestFullscreen()
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen() // iOS Safari
  }

  return (
    <section className="ai-hero">
      <div className="ai-hero__bg" aria-hidden="true">
        <div className="ai-grid" />
        <span className="ai-orb ai-orb--blue" />
        <span className="ai-orb ai-orb--violet" />
        <span className="ai-orb ai-orb--cyan" />
      </div>

      <div className="ai-hero__inner">
        <p className="ai-eyebrow ai-reveal" style={{ '--i': 0 }}>
          <span className="ai-pulse" aria-hidden="true" />
          <strong>{h.eyebrowTag}</strong>
          <span aria-hidden="true">·</span>
          {h.eyebrow}
        </p>

        <h1 className="ai-title ai-reveal" style={{ '--i': 1 }}>
          <span>{h.titleLine1}</span>
          <span className="ai-title__shine">{h.titleLine2}</span>
        </h1>

        <p className="ai-sub ai-reveal" style={{ '--i': 2 }}>
          {renderBold(h.sub)}
        </p>

        <div className="ai-ctas ai-reveal" style={{ '--i': 3 }}>
          <a href="#demo" className="ai-btn ai-btn--primary">
            {h.ctaDemo}
            {Icon.arrow}
          </a>
          <a href="#tarifs" className="ai-btn ai-btn--ghost">
            {h.ctaPricing}
          </a>
        </div>
        <p className="ai-micro ai-reveal" style={{ '--i': 4 }}>
          {h.micro.join(' · ')}
        </p>

        <div className="ai-stage ai-reveal" style={{ '--i': 5 }}>
          <div className="ai-frame">
            <div className={`ai-screen${playing ? '' : ' is-paused'}`}>
              <video
                ref={videoRef}
                src={VIDEO_SRC}
                poster={POSTER_SRC}
                autoPlay={autoPlay}
                muted
                loop
                playsInline
                preload="metadata"
                aria-label={h.video.label}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
                onTimeUpdate={onTimeUpdate}
              />

              <button
                type="button"
                className="ai-screen__hit"
                onClick={togglePlay}
                aria-label={playing ? h.video.pause : h.video.play}
              >
                <span className="ai-play">{Icon.play}</span>
              </button>

              <div className="ai-topbar" aria-hidden="true">
                <span className="ai-dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="ai-topbar__title">{h.video.title}</span>
                <span className="ai-live">
                  <i />
                  {h.video.live}
                </span>
              </div>

              <div className="ai-controls">
                <button
                  type="button"
                  className="ai-ctrl"
                  onClick={toggleSound}
                  aria-pressed={!muted}
                  aria-label={muted ? h.video.unmute : h.video.mute}
                >
                  {muted ? Icon.soundOff : Icon.soundOn}
                  <span className="ai-ctrl__label">{muted ? h.video.unmute : h.video.mute}</span>
                </button>
                <button type="button" className="ai-ctrl" onClick={enterFullscreen} aria-label={h.video.fullscreen}>
                  {Icon.expand}
                  <span className="ai-ctrl__label">{h.video.fullscreen}</span>
                </button>
              </div>

              <div className="ai-progress" aria-hidden="true">
                <span ref={barRef} />
              </div>
            </div>
          </div>

          {h.chips.map((chip, i) => (
            <div className={`ai-chip-wrap ai-chip-wrap--${i + 1}`} key={chip.title} aria-hidden="true">
              <div className="ai-chip">
                <span className="ai-chip__icon">{chip.icon}</span>
                <span>
                  <strong>{chip.title}</strong>
                  <small>{chip.text}</small>
                </span>
              </div>
            </div>
          ))}
        </div>

        <ul className="ai-trust ai-reveal" style={{ '--i': 6 }}>
          {h.trust.map((item, i) => (
            <li key={item}>
              {TRUST_ICONS[i]}
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
