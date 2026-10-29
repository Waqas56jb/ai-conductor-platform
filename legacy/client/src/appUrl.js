// The product (sign-in, sign-up, every panel) is the Next.js app; this site is marketing only.
const APP_URL = (import.meta.env.VITE_APP_URL || 'https://pratonna-app.vercel.app').replace(/\/$/, '')

export const appLink = (path) => `${APP_URL}${path}`
