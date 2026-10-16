/**
 * Format a price value to Indonesian Rupiah format.
 * IDR is a zero-decimal currency, so Vendure (with IdrMoneyStrategy, precision 0)
 * stores the price as the actual Rupiah amount — no division needed.
 * Example: 150000 -> "Rp 150.000"
 */
export function formatPriceIDR(priceInRupiah: number): string {
  const amount = Math.round(priceInRupiah)
  return `Rp ${amount.toLocaleString('id-ID')}`
}

/**
 * Block-level elements. These must become a space when removed, otherwise
 * adjacent blocks glue together ("</h2><p>" -> "DeployAplikasi").
 * Inline elements (strong/em/span/a/…) are removed with no space, so
 * "Kopi<strong>Kode</strong>" stays "KopiKode" instead of gaining a stray space.
 */
const BLOCK_TAGS = [
  'address', 'article', 'aside', 'blockquote', 'br', 'dd', 'div', 'dl', 'dt',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h[1-6]', 'header',
  'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'tbody',
  'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
].join('|')

const BLOCK_TAG_RE = new RegExp(`</?(?:${BLOCK_TAGS})\\b[^>]*>`, 'gi')

/**
 * Common HTML entities found in Vendure rich-text descriptions.
 * Ordered so `&amp;` is decoded last — otherwise "&amp;lt;" would turn into a
 * literal "<" instead of the text "&lt;".
 */
const HTML_ENTITIES: Array<[RegExp, string]> = [
  [/&nbsp;/gi, ' '],
  [/&lt;/gi, '<'],
  [/&gt;/gi, '>'],
  [/&quot;/gi, '"'],
  [/&#0*39;/g, "'"],
  [/&#x0*27;/gi, "'"],
  [/&hellip;/gi, '…'],
  [/&mdash;/gi, '—'],
  [/&ndash;/gi, '–'],
  [/&amp;/gi, '&'],
]

/**
 * Convert a rich-text HTML description into displayable plain text.
 *
 * Product descriptions come from Vendure's rich-text editor, so they contain
 * markup (`<h2>`, `<strong>`, `<table>`, …) and entities (`&nbsp;`, `&amp;`).
 * Rendering that raw in a plain text node leaks the tags to the shopper.
 *
 * The output is plain text, so callers must render it with text interpolation
 * (`{{ }}`) — never `v-html` — which is also what makes it safe: any `<` left in
 * the text is escaped by the template, not executed.
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return ''

  let text = html
    // Drop script/style elements entirely, including their contents.
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    // Block elements become a space so words are not glued together.
    .replace(BLOCK_TAG_RE, ' ')
    // Every remaining tag is inline formatting: remove it without a space.
    .replace(/<[^>]*>/g, '')

  for (const [pattern, replacement] of HTML_ENTITIES) {
    text = text.replace(pattern, replacement)
  }

  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Build a short display blurb from a (possibly rich-text) description.
 *
 * Strips markup/entities first, so callers can pass either a curated plain
 * `shortDescription` or a raw HTML `description` and always get clean text.
 * Adds an ellipsis when truncated.
 */
export function truncateDescription(description: string, maxLength: number = 150): string {
  const text = stripHtml(description)
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '...'
}

/**
 * Format a byte count into a human-readable file size.
 * Example: 15728640 -> "15 MB"
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  // Whole numbers for bytes/KB, one decimal for larger units.
  const rounded = exponent <= 1 ? Math.round(value) : Math.round(value * 10) / 10
  const formatted = rounded.toLocaleString('id-ID', { maximumFractionDigits: 1 })
  return `${formatted} ${units[exponent]}`
}

/**
 * Map a MIME type to a short, shopper-friendly format label.
 * Falls back to the raw MIME type when it is not recognised.
 */
export function formatMimeType(mimeType: string | null | undefined): string {
  if (!mimeType) return ''
  const map: Record<string, string> = {
    'application/zip': 'ZIP Archive',
    'application/x-zip-compressed': 'ZIP Archive',
    'application/pdf': 'PDF Document',
    'application/epub+zip': 'EPUB',
    'application/x-rar-compressed': 'RAR Archive',
    'application/gzip': 'GZIP Archive',
  }
  return map[mimeType.toLowerCase()] || mimeType
}
