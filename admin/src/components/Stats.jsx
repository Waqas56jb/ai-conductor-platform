import { useEffect, useRef, useState } from 'react'

const stats = [
  { value: 12, suffix: 'k+', label: 'Heures économisées par mois' },
  { value: 98, suffix: '%', label: 'Tâches traitées sans oubli' },
  { value: 3, suffix: 'x', label: 'Productivité des équipes' },
  { value: 24, suffix: '/7', label: 'Agent intelligent actif' },
]

function useCountUp(target, run) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!run) return
    let raf
    const start = performance.now()
    const dur = 1400
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [run, target])
  return val
}

function Stat({ value, suffix, label, run }) {
  const n = useCountUp(value, run)
  return (
    <div className="text-center">
      <p className="font-display text-4xl font-extrabold text-white sm:text-5xl">
        {n}
        <span className="text-brand-200">{suffix}</span>
      </p>
      <p className="mt-2 text-sm font-medium text-brand-100/90">{label}</p>
    </div>
  )
}

export default function Stats() {
  const ref = useRef(null)
  const [run, setRun] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => e.isIntersecting && setRun(true),
      { threshold: 0.4 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section ref={ref} className="relative overflow-hidden bg-brand-gradient py-16">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-20" />
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-violet-400/20 blur-3xl" />
      <div className="container-x relative">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((s) => (
            <Stat key={s.label} {...s} run={run} />
          ))}
        </div>
      </div>
    </section>
  )
}
