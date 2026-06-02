import Navbar from './components/Navbar'
import Hero from './components/Hero'
import TrustBar from './components/TrustBar'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import AgentShowcase from './components/AgentShowcase'
import Industries from './components/Industries'
import Stats from './components/Stats'
import Integrations from './components/Integrations'
import Pricing from './components/Pricing'
import Security from './components/Security'
import Testimonials from './components/Testimonials'
import FAQ from './components/FAQ'
import CTA from './components/CTA'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="overflow-x-hidden">
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <Features />
        <HowItWorks />
        <AgentShowcase />
        <Industries />
        <Stats />
        <Integrations />
        <Pricing />
        <Security />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
