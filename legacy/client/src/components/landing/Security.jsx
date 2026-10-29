import { useLanguage } from '../../context/LanguageContext'
import Icon from './icons'
import { Reveal } from './Reveal'
import SectionHead from './SectionHead'
import './security.css'

const ICONS = ['shield', 'lock', 'database', 'key', 'userCheck']

export default function Security() {
  const { t } = useLanguage()
  const s = t.landing.security

  return (
    <section id="securite" className="lp-section lp-security" aria-labelledby="lp-security-title">
      <div className="lp-container">
        <SectionHead id="lp-security-title" eyebrow={s.eyebrow} title={s.title} sub={s.sub} />

        <ul className="lp-security__grid">
          {s.items.map((item, i) => (
            <Reveal as="li" key={item.title} delay={i * 80}>
              <article className={`lp-card lp-security__item${i === s.items.length - 1 ? ' lp-gborder is-key' : ''}`}>
                <span className="lp-security__icon">
                  <Icon name={ICONS[i]} />
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
