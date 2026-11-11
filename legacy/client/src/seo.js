import { useEffect } from 'react'

export const SITE_URL = 'https://pratonna.com'

/** Sets `attr` on the head element matching `selector`, creating it from `attrs` if missing. */
function headTag(tag, attrs, attr, value) {
  const selector = `${tag}${Object.entries(attrs)
    .map(([k, v]) => `[${k}="${v}"]`)
    .join('')}`
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement(tag)
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

/**
 * Title, description, canonical URL and share tags of the current page. The
 * build also writes them into each route's static HTML (scripts/route-heads.mjs)
 * for crawlers and link previews that do not run JavaScript.
 */
export function useMeta({ title, description, path }) {
  useEffect(() => {
    const url = `${SITE_URL}${path}`
    document.title = title
    headTag('meta', { name: 'description' }, 'content', description)
    headTag('link', { rel: 'canonical' }, 'href', url)
    headTag('meta', { property: 'og:title' }, 'content', title)
    headTag('meta', { property: 'og:description' }, 'content', description)
    headTag('meta', { property: 'og:url' }, 'content', url)
  }, [title, description, path])
}
