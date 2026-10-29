import { useEffect } from 'react'
import '../components/landing/landing.css'
import Header from '../components/landing/Header'
import Hero from '../components/hero/Hero'
import TrustStrip from '../components/landing/TrustStrip'
import ProblemSolution from '../components/landing/ProblemSolution'
import HowItWorks from '../components/landing/HowItWorks'
import Features from '../components/landing/Features'
import Integrations from '../components/landing/Integrations'
import UseCases from '../components/landing/UseCases'
import Industries from '../components/landing/Industries'
import ProductScreens from '../components/landing/ProductScreens'
import Security from '../components/landing/Security'
import Pricing from '../components/landing/Pricing'
import Pilot from '../components/landing/Pilot'
import Faq from '../components/landing/Faq'
import DemoContact from '../components/landing/DemoContact'
import FinalCta from '../components/landing/FinalCta'
import Footer from '../components/landing/Footer'

export default function Landing() {
  useEffect(() => {
    document.body.classList.add('lp-body')
    // Arriving with a hash (e.g. /#tarifs): the target only exists after render,
    // so the browser's own jump was missed. Wait for the web fonts too, or the
    // font swap reflows the page and the jump lands in the wrong place.
    const { hash } = window.location
    if (hash) {
      document.fonts.ready.then(() =>
        requestAnimationFrame(() => document.querySelector(hash)?.scrollIntoView({ behavior: 'instant' })),
      )
    }
    return () => document.body.classList.remove('lp-body')
  }, [])

  return (
    <div className="lp">
      <Header />
      <main>
        <Hero />
        <TrustStrip />
        <ProblemSolution />
        <HowItWorks />
        <Features />
        <Integrations />
        <UseCases />
        <Industries />
        <ProductScreens />
        <Security />
        <Pricing />
        <Pilot />
        <Faq />
        <DemoContact />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
