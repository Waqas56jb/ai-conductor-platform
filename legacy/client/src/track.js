import { appLink } from './appUrl'

// Anonymous funnel counters sent to the app (/api/demo/events): no cookie,
// no identifier. Visitors who ask not to be tracked are never counted.
const ATTRIBUTION_KEY = 'pratonna.attribution'

const optedOut = () =>
  navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1'

const device = () => (window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1100 ? 'tablet' : 'desktop')

/**
 * Where this visit came from (utm_* or ?src=qr on a flyer), kept for the
 * session so a later booking is credited to it.
 */
export function attribution() {
  const params = new URLSearchParams(window.location.search)
  const fresh = {
    source: params.get('utm_source') || params.get('src') || undefined,
    medium: params.get('utm_medium') || (params.get('src') === 'qr' ? 'qr' : undefined),
    campaign: params.get('utm_campaign') || undefined,
  }
  try {
    if (fresh.source) sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(fresh))
    return fresh.source ? fresh : JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || '{}')
  } catch {
    return fresh
  }
}

/** Page name for the stats: "home", "immobilier", "btp"… */
export const pageName = () => window.location.pathname.replace(/^\/|\/$/g, '') || 'home'

export function track(name, placement) {
  if (optedOut()) return
  const body = JSON.stringify({ name, placement, page: pageName(), device: device(), ...attribution() })
  // text/plain keeps it a "simple" request: no CORS preflight, survives navigation.
  fetch(appLink('/api/demo/events'), {
    method: 'POST',
    body,
    keepalive: true,
    headers: { 'Content-Type': 'text/plain' },
  }).catch(() => {})
}
