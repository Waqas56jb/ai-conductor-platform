import { useRef } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { track } from '../../track'
import './demo-video.css'

// The 1-minute narrated demo built from real app screens (scripts/video).
export const DEMO_VIDEO = '/demo-immobilier.mp4'
export const DEMO_VIDEO_MOBILE = '/demo-immobilier-720.mp4'
export const DEMO_POSTER = '/demo-immobilier-poster.jpg'

export default function DemoVideo({ placement }) {
  const { t } = useLanguage()
  const s = t.landing.video
  const counted = useRef(false)

  function onPlay() {
    if (counted.current) return
    counted.current = true
    track('video_play', placement)
  }

  return (
    <figure className="lp-video">
      <div className="lp-video__frame">
        <video controls playsInline preload="none" poster={DEMO_POSTER} aria-label={s.label} onPlay={onPlay}>
          <source src={DEMO_VIDEO_MOBILE} type="video/mp4" media="(max-width: 900px)" />
          <source src={DEMO_VIDEO} type="video/mp4" />
        </video>
      </div>
      <figcaption>{s.caption}</figcaption>
    </figure>
  )
}
