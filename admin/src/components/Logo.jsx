/**
 * Logo Pratonna — marque "P" en dégradé + nom de marque.
 * @param {{ light?: boolean, className?: string }} props
 */
export default function Logo({ light = false, className = '' }) {
  return (
    <a href="#top" className={`group inline-flex items-center gap-2.5 ${className}`}>
      <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-brand-gradient shadow-glow transition-transform duration-300 group-hover:scale-105">
        <svg viewBox="0 0 64 64" className="h-6 w-6" fill="none">
          <path
            d="M21 17h13.5c6.6 0 11 4 11 10s-4.4 10-11 10H29v10h-8V17Zm8 14h5c2.6 0 4.3-1.5 4.3-4s-1.7-4-4.3-4h-5v8Z"
            fill="white"
          />
          <circle cx="44" cy="20" r="4" fill="white" opacity="0.9" />
        </svg>
      </span>
      <span
        className={`font-display text-xl font-extrabold tracking-tight ${
          light ? 'text-white' : 'text-ink'
        }`}
      >
        PRATONNA
      </span>
    </a>
  )
}
