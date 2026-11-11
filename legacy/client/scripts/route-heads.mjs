// Writes each marketing route's own HTML head after `vite build`: crawlers and
// link previews (WhatsApp, LinkedIn…) read it without running JavaScript.
// Vercel serves dist/<route>.html for /<route> (cleanUrls in vercel.json).
import fs from 'node:fs'
import { translations } from '../src/i18n/translations.js'

const SITE = 'https://pratonna.com'
const fr = translations.fr.landing
const ROUTES = [
  { path: '/', file: 'index.html', meta: fr.meta },
  { path: '/immobilier', file: 'immobilier.html', meta: fr.pages.immobilier.meta },
  { path: '/btp', file: 'btp.html', meta: fr.pages.btp.meta },
]

const escape = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const template = fs.readFileSync('dist/index.html', 'utf8')

function swap(html, pattern, replacement) {
  if (!pattern.test(html)) throw new Error(`index.html: no match for ${pattern}`)
  return html.replace(pattern, replacement)
}

for (const { path, file, meta } of ROUTES) {
  const url = `${SITE}${path}`
  const title = escape(meta.title)
  const description = escape(meta.description)
  let html = template
  html = swap(html, /<title>[^<]*<\/title>/, `<title>${title}</title>`)
  html = swap(html, /(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${description}$2`)
  html = swap(html, /(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
  html = swap(html, /(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
  html = swap(html, /(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`)
  html = swap(html, /(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${description}$2`)
  html = swap(html, /(<meta name="twitter:title" content=")[^"]*(")/, `$1${title}$2`)
  html = swap(html, /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${description}$2`)
  fs.writeFileSync(`dist/${file}`, html)
}

const today = new Date().toISOString().slice(0, 10)
fs.writeFileSync(
  'dist/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ROUTES.map((r) => `  <url><loc>${SITE}${r.path}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`,
)
console.log(`route heads: ${ROUTES.map((r) => r.path).join(', ')} + sitemap.xml`)
