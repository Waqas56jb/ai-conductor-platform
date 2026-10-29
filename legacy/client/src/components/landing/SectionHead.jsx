import { Reveal } from './Reveal'

export default function SectionHead({ eyebrow, title, sub, id }) {
  return (
    <Reveal className="lp-head">
      {eyebrow ? <p className="lp-eyebrow">{eyebrow}</p> : null}
      <h2 className="lp-title" id={id}>
        {title}
      </h2>
      {sub ? <p className="lp-sub">{sub}</p> : null}
    </Reveal>
  )
}
