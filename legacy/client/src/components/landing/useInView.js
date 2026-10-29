import { useEffect, useRef, useState } from 'react'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// One observer shared by every revealed element on the page.
const callbacks = new WeakMap()
let observer = null

function getObserver() {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          callbacks.get(entry.target)?.()
          callbacks.delete(entry.target)
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
  }
  return observer
}

/** Returns [ref, inView]; inView flips to true once, the first time the element scrolls into view. */
export function useInView() {
  const ref = useRef(null)
  const [inView, setInView] = useState(
    () => prefersReducedMotion() || typeof IntersectionObserver === 'undefined',
  )

  useEffect(() => {
    const el = ref.current
    if (inView || !el) return
    const obs = getObserver()
    callbacks.set(el, () => setInView(true))
    obs.observe(el)
    return () => {
      callbacks.delete(el)
      obs.unobserve(el)
    }
  }, [inView])

  return [ref, inView]
}
