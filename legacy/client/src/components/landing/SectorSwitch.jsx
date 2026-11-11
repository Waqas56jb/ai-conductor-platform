import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import DemoVideo from './DemoVideo'
import FeatureParts from './FeatureParts'
import Icon from './icons'
import Industries from './Industries'
import SectionHead from './SectionHead'
import TrustStrip from './TrustStrip'
import './sector-switch.css'

const TABS = ['realEstate', 'others']

// Links to the other trades' cards (/#solutions) open on "Autres activités".
const initialTab = () => (window.location.hash === '#solutions' ? 'others' : 'realEstate')

/**
 * Real estate first, the other trades one click away: Pratonna's launch
 * focuses on property managers and agencies.
 */
export default function SectorSwitch() {
  const { t } = useLanguage()
  const s = t.landing.sectorSwitch
  const [tab, setTab] = useState(initialTab)

  useEffect(() => {
    const onHash = () => window.location.hash === '#solutions' && setTab('others')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function onKeyDown(e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const next = TABS[(TABS.indexOf(tab) + 1) % TABS.length]
    setTab(next)
    document.getElementById(`lp-tab-${next}`)?.focus()
  }

  return (
    <section id="secteurs" className="lp-section lp-switch" aria-label={s.label}>
      <div className="lp-container">
        <div className="lp-switch__tabs" role="tablist" aria-label={s.label} onKeyDown={onKeyDown}>
          {TABS.map((key) => (
            <button
              key={key}
              id={`lp-tab-${key}`}
              type="button"
              role="tab"
              aria-selected={tab === key}
              aria-controls={`lp-panel-${key}`}
              tabIndex={tab === key ? 0 : -1}
              className={tab === key ? 'is-active' : ''}
              onClick={() => setTab(key)}
            >
              <Icon name={key === 'realEstate' ? 'home' : 'briefcase'} />
              {s[key]}
            </button>
          ))}
        </div>
      </div>

      {tab === 'realEstate' ? (
        <div id="lp-panel-realEstate" role="tabpanel" aria-labelledby="lp-tab-realEstate">
          <div className="lp-container">
            <SectionHead id="lp-re-title" eyebrow={s.reEyebrow} title={s.reTitle} sub={s.reSub} />
            <DemoVideo placement="home" />
            <div className="lp-switch__parts">
              <FeatureParts parts={t.landing.realEstate.parts} />
            </div>
            <p className="lp-switch__more">
              <Link to="/immobilier" className="ai-btn ai-btn--ghost">
                {s.reCta}
                <Icon name="arrow" />
              </Link>
            </p>
          </div>
        </div>
      ) : (
        <div id="lp-panel-others" role="tabpanel" aria-labelledby="lp-tab-others">
          <TrustStrip />
          <Industries />
          <p className="lp-switch__more">
            <Link to="/btp" className="ai-btn ai-btn--ghost">
              {s.othersCta}
              <Icon name="arrow" />
            </Link>
          </p>
        </div>
      )}
    </section>
  )
}
