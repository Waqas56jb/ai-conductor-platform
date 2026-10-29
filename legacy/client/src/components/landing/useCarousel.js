import { useCallback, useEffect, useRef, useState } from 'react'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// Scroll position of each slide, relative to the first.
function offsets(track) {
  const slides = [...(track?.children ?? [])]
  const first = slides[0]?.offsetLeft ?? 0
  return slides.map((el) => el.offsetLeft - first)
}

// The slide closest to the left edge of the track.
function nearest(track, count) {
  if (!track) return 0
  // Scrolled to the end: the last slide counts as shown even if it cannot reach the left edge.
  if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 2) return count - 1
  const all = offsets(track)
  let best = 0
  all.forEach((x, i) => {
    if (Math.abs(x - track.scrollLeft) < Math.abs(all[best] - track.scrollLeft)) best = i
  })
  return best
}

/**
 * Horizontal scroll-snap carousel: arrows, dots and mouse drag. Touch already
 * scrolls natively, so dragging is only wired for mouse and pen pointers.
 */
export function useCarousel(count) {
  const trackRef = useRef(null)
  const drag = useRef(null)
  const [active, setActive] = useState(0)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const onScroll = () => setActive(nearest(track, count))
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => track.removeEventListener('scroll', onScroll)
  }, [count])

  const goTo = useCallback((index) => {
    const track = trackRef.current
    if (!track) return
    const i = Math.max(0, Math.min(count - 1, index))
    track.scrollTo({ left: offsets(track)[i], behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [count])

  const onPointerDown = (e) => {
    if (e.pointerType === 'touch' || e.button !== 0) return
    const track = trackRef.current
    drag.current = { x: e.clientX, left: track.scrollLeft, moved: false }
    track.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    if (!d.moved && Math.abs(dx) < 4) return
    if (!d.moved) {
      d.moved = true
      setDragging(true)
    }
    trackRef.current.scrollLeft = d.left - dx
  }

  const onPointerUp = (e) => {
    const d = drag.current
    drag.current = null
    if (!d?.moved) return
    trackRef.current.releasePointerCapture?.(e.pointerId)
    setDragging(false)
    // Settle on a slide, in the direction of the drag.
    const index = nearest(trackRef.current, count)
    const dx = e.clientX - d.x
    goTo(index === active && Math.abs(dx) > 40 ? active + (dx < 0 ? 1 : -1) : index)
  }

  return {
    active,
    dragging,
    goTo,
    prev: () => goTo(active - 1),
    next: () => goTo(active + 1),
    trackProps: {
      ref: trackRef,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  }
}
