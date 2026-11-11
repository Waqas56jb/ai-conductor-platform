// Every marketing page ends with the booking form; the legal pages do not.
const PAGES_WITH_FORM = ['/', '/immobilier', '/btp']

/** Where a "free demo" link points from the current page. */
export const demoHref = () => (PAGES_WITH_FORM.includes(window.location.pathname) ? '#demo' : '/#demo')
