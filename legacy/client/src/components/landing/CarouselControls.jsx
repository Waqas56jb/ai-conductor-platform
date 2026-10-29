import Icon from './icons'

/** Previous / next arrows and one dot per slide. */
export default function CarouselControls({ count, active, goTo, prev, next, labels }) {
  return (
    <div className="lp-carousel__controls">
      <button
        type="button"
        className="lp-carousel__arrow lp-carousel__arrow--prev"
        onClick={prev}
        disabled={active === 0}
        aria-label={labels.prev}
      >
        <Icon name="arrow" />
      </button>
      <div className="lp-carousel__dots">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            className={i === active ? 'is-active' : ''}
            aria-label={`${labels.goTo} ${i + 1}`}
            aria-current={i === active ? 'true' : undefined}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
      <button
        type="button"
        className="lp-carousel__arrow"
        onClick={next}
        disabled={active === count - 1}
        aria-label={labels.next}
      >
        <Icon name="arrow" />
      </button>
    </div>
  )
}
