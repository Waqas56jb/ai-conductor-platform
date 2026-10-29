import { useLanguage } from '../../context/LanguageContext'
import Icon from './icons'
import { Reveal } from './Reveal'
import { useInView } from './useInView'
import SectionHead from './SectionHead'
import './how-it-works.css'

const ICONS = ['plug', 'brain', 'mic', 'checkCircle']

export default function HowItWorks() {
  const { t } = useLanguage()
  const s = t.landing.how
  const [ref, inView] = useInView()

  return (
    <section id="comment-ca-marche" className="lp-section lp-how" aria-labelledby="lp-how-title">
      <div className="lp-container">
        <SectionHead id="lp-how-title" eyebrow={s.eyebrow} title={s.title} sub={s.sub} />

        <ol ref={ref} className={`lp-how__steps${inView ? ' is-drawn' : ''}`}>
          {s.steps.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 140} className="lp-how__step">
              <div className="lp-how__node">
                <Icon name={ICONS[i]} />
                <span className="lp-how__num">{i + 1}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
