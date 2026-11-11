import { track } from '../../track'

/** "Book a FREE demo" link: scrolls to the booking form and counts the click. */
export default function DemoCta({ placement, className = 'ai-btn ai-btn--primary', children, href = '#demo', onClick }) {
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        track('demo_click', placement)
        onClick?.(e)
      }}
    >
      {children}
    </a>
  )
}
