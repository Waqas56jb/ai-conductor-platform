import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import Icon from '../landing/icons'
import './hero.css'

// Background: 720p on phones, 1080p elsewhere. The lightbox uses the version with sound.
const VIDEO_SRC = '/final-web.mp4'
const VIDEO_MOBILE_SRC = '/final-web-mobile.mp4'
const VIDEO_AUDIO_SRC = '/final-web-audio.mp4'
const POSTER_SRC = '/final-poster.jpg'
// The assistant, as a woman then a man: a cut-out portrait on desktop, a round
// head on smaller screens. Same order as hero.avatar.personas.
const PERSONAS = [
  { portrait: '/avatar-portrait.webp', head: '/avatar-head.webp' },
  { portrait: '/avatar-man-portrait.webp', head: '/avatar-man-head.webp' },
]
const PERSONA_MS = 8000
// Background files encoded without an audio track.
const SILENT_SOURCES = [VIDEO_MOBILE_SRC]
// Typewriter timing per line: type, hold, erase = 2.4 s in total.
const TYPE_MS = 1100
const HOLD_MS = 900
const ERASE_MS = 400
// Speech bubble: typed once, after the headline has come in.
const BUBBLE_DELAY_MS = 900
const BUBBLE_CHAR_MS = 32

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function useTypewriter(lines, enabled) {
  const [text, setText] = useState(enabled ? '' : lines[0])

  useEffect(() => {
    if (!enabled) {
      setText(lines[0])
      return
    }
    let timer
    let index = 0
    const type = (line, n) => {
      setText(line.slice(0, n))
      timer =
        n < line.length
          ? setTimeout(() => type(line, n + 1), TYPE_MS / line.length)
          : setTimeout(() => erase(line, line.length), HOLD_MS)
    }
    const erase = (line, n) => {
      setText(line.slice(0, n))
      if (n > 0) {
        timer = setTimeout(() => erase(line, n - 1), ERASE_MS / line.length)
      } else {
        index = (index + 1) % lines.length
        type(lines[index], 0)
      }
    }
    type(lines[0], 0)
    return () => clearTimeout(timer)
  }, [lines, enabled])

  return text
}

function useTypeOnce(line, enabled) {
  const [text, setText] = useState(enabled ? '' : line)

  useEffect(() => {
    if (!enabled) {
      setText(line)
      return
    }
    setText('')
    let n = 0
    let timer = setTimeout(function next() {
      n += 1
      setText(line.slice(0, n))
      if (n < line.length) timer = setTimeout(next, BUBBLE_CHAR_MS)
    }, BUBBLE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [line, enabled])

  return text
}

export default function Hero() {
  const { t } = useLanguage()
  const h = t.hero
  const [motion] = useState(() => !prefersReducedMotion())
  const typed = useTypewriter(h.typed, motion)
  const [persona, setPersona] = useState(0)
  const speaker = h.avatar.personas[persona]
  const bubble = useTypeOnce(speaker.bubble, motion)

  useEffect(() => {
    if (!motion) return
    const timer = setInterval(() => setPersona((p) => (p + 1) % PERSONAS.length), PERSONA_MS)
    return () => clearInterval(timer)
  }, [motion])

  const bgRef = useRef(null)
  const dialogRef = useRef(null)
  const lightboxVideoRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)

  // Background video: forced muted (autoplay policy, and React doesn't reliably
  // reflect the attribute). If autoplay is refused, start on first interaction.
  useEffect(() => {
    const video = bgRef.current
    if (!video) return
    video.muted = true
    if (!motion) return

    let removeRetry = () => {}
    video.play().catch(() => {
      const retry = () => video.play().catch(() => {})
      document.addEventListener('pointerdown', retry, { once: true })
      removeRetry = () => document.removeEventListener('pointerdown', retry)
    })
    return () => removeRetry()
  }, [motion])

  function toggleSound() {
    const video = bgRef.current
    if (!video) return
    // A silent background (the mobile file) has nothing to unmute: play the
    // full presentation with sound instead.
    if (video.muted && SILENT_SOURCES.some((src) => video.currentSrc.endsWith(src))) {
      openLightbox()
      return
    }
    if (video.muted) {
      video.muted = false
      video.currentTime = 0
      video.play().catch(() => {})
    } else {
      video.muted = true
    }
  }

  function playBackground() {
    bgRef.current?.play().catch(() => {})
  }

  function openLightbox() {
    const dialog = dialogRef.current
    const video = lightboxVideoRef.current
    if (!dialog || !video) return
    // The page video keeps looping, but silently, behind the lightbox.
    if (bgRef.current) bgRef.current.muted = true
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    video.currentTime = 0
    video.muted = false
    video.play().catch(() => {})
  }

  function onLightboxClose() {
    lightboxVideoRef.current?.pause()
    document.body.style.overflow = ''
  }

  // Clicks on the dialog itself (not its content) are clicks on the backdrop.
  function onLightboxClick(e) {
    if (e.target === dialogRef.current) dialogRef.current.close()
  }

  return (
    <section className={`ai-hero${motion ? '' : ' is-static'}`} aria-labelledby="ai-hero-title">
      <div className="ai-hero__media">
        <video
          ref={bgRef}
          className="ai-hero__video"
          poster={POSTER_SRC}
          autoPlay={motion}
          muted
          loop
          playsInline
          preload="auto"
          aria-label={h.video.label}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
        >
          <source src={VIDEO_MOBILE_SRC} type="video/mp4" media="(max-width: 768px)" />
          <source src={VIDEO_SRC} type="video/mp4" />
        </video>
        <div className="ai-hero__shade" aria-hidden="true" />
        <div className="ai-hero__grain" aria-hidden="true" />
      </div>

      <div className="ai-hero__inner">
        <figure className="ai-avatar" aria-label={speaker.alt}>
          <span className="ai-avatar__glow" aria-hidden="true" />
          <span className="ai-avatar__ring" aria-hidden="true" />
          {PERSONAS.map((p, i) => (
            <img
              key={p.portrait}
              className={`ai-avatar__portrait${i === persona ? '' : ' is-away'}`}
              src={p.portrait}
              alt={i === persona ? speaker.alt : ''}
              aria-hidden={i === persona ? undefined : 'true'}
              width="1075"
              height="992"
              fetchPriority={i === 0 ? 'high' : 'low'}
            />
          ))}
          <figcaption className="ai-bubble">
            <span aria-hidden="true">
              {bubble}
              {bubble.length < speaker.bubble.length ? <span className="ai-typed__cursor" /> : null}
            </span>
            <span className="lp-sr-only">{speaker.bubble}</span>
          </figcaption>
        </figure>

        <div className="ai-hero__content">
          <span className="ai-hero__head" aria-hidden="true">
            {PERSONAS.map((p, i) => (
              <img key={p.head} className={i === persona ? '' : 'is-away'} src={p.head} alt="" width="160" height="160" />
            ))}
          </span>
          <p className="ai-eyebrow ai-in" style={{ '--i': 0 }}>
            <span className="ai-pulse" aria-hidden="true" />
            <strong>{h.eyebrowTag}</strong>
            <span aria-hidden="true">·</span>
            {h.eyebrow}
          </p>

          <h1 className="ai-title ai-in" style={{ '--i': 1 }} id="ai-hero-title">
            <span>{h.titleLine1}</span>
            <span className="ai-title__shine">{h.titleLine2}</span>
          </h1>

          <p className="ai-typed ai-in" style={{ '--i': 2 }}>
            <span aria-hidden="true">
              {typed}
              <span className="ai-typed__cursor" />
            </span>
            <span className="lp-sr-only">{h.typed.join(' ')}</span>
          </p>

          <p className="ai-lead ai-in" style={{ '--i': 3 }}>
            {h.lead}
          </p>

          <div className="ai-ctas ai-in" style={{ '--i': 4 }}>
            <a href="#demo" className="ai-btn ai-btn--primary ai-btn--glow">
              {h.ctaDemo}
              <Icon name="arrow" />
            </a>
            <button type="button" className="ai-btn ai-btn--ghost" onClick={openLightbox}>
              <span className="ai-play-dot" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M8 5.5v13l11-6.5z" />
                </svg>
              </span>
              {h.ctaWatch}
            </button>
          </div>

          <p className="ai-micro ai-in" style={{ '--i': 5 }}>
            {h.micro.join(' · ')}
          </p>
        </div>

      </div>

      <div className="ai-hero__bottom">
        <div className="ai-hero__row">
          <a href="#secteurs" className="ai-discover">
            {h.discover}
            <span className="ai-discover__arrow" aria-hidden="true">
              ↓
            </span>
          </a>
          <div className="ai-controls">
            {playing ? null : (
              <button type="button" className="ai-ctrl" onClick={playBackground}>
                <svg viewBox="0 0 24 24" aria-hidden="true" className="ai-ctrl__fill">
                  <path d="M8 5.5v13l11-6.5z" />
                </svg>
                <span className="ai-ctrl__label">{h.video.play}</span>
              </button>
            )}
            <button
              type="button"
              className="ai-ctrl"
              onClick={toggleSound}
              aria-pressed={!muted}
              aria-label={muted ? h.video.unmute : h.video.mute}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 9v6h4l5 4V5L8 9H4z" />
                {muted ? (
                  <path d="M17 9.5l5 5M22 9.5l-5 5" />
                ) : (
                  <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
                )}
              </svg>
              <span className="ai-ctrl__label">{muted ? h.video.unmute : h.video.mute}</span>
            </button>
          </div>
        </div>

        <ul className="ai-stats">
          {h.stats.map((stat) => (
            <li key={stat.value}>
              <strong>{stat.value}</strong>
              {stat.label ? <span>{stat.label}</span> : null}
            </li>
          ))}
        </ul>
      </div>

      <dialog
        ref={dialogRef}
        className="ai-lightbox"
        aria-label={h.lightbox.label}
        onClose={onLightboxClose}
        onClick={onLightboxClick}
      >
        <div className="ai-lightbox__frame">
          <button
            type="button"
            className="ai-lightbox__close"
            aria-label={h.lightbox.close}
            onClick={() => dialogRef.current?.close()}
          >
            <Icon name="x" />
          </button>
          <video ref={lightboxVideoRef} src={VIDEO_AUDIO_SRC} poster={POSTER_SRC} controls playsInline preload="none" />
        </div>
      </dialog>
    </section>
  )
}
