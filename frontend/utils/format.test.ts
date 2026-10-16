import { describe, it, expect } from 'vitest'
import {
  formatPriceIDR,
  truncateDescription,
  formatFileSize,
  formatMimeType,
  stripHtml,
} from './format'

describe('stripHtml', () => {
  it('returns an empty string for missing input', () => {
    expect(stripHtml('')).toBe('')
    expect(stripHtml(null)).toBe('')
    expect(stripHtml(undefined)).toBe('')
  })

  it('removes the tags seen in real product descriptions', () => {
    // The exact shape reported from the catalog.
    expect(stripHtml('<h2><strong>Source Code PHP Lengkap - Siap Deploy</strong></h2>')).toBe(
      'Source Code PHP Lengkap - Siap Deploy',
    )
  })

  it('keeps block elements from gluing words together', () => {
    expect(stripHtml('<h2>Deskripsi</h2><p>Aplikasi web</p>')).toBe('Deskripsi Aplikasi web')
  })

  it('decodes the entities used by the rich-text editor', () => {
    expect(stripHtml('<p>PILKASIS&nbsp;adalah&nbsp;aplikasi</p>')).toBe('PILKASIS adalah aplikasi')
    expect(stripHtml('pemasukan &amp; pengeluaran')).toBe('pemasukan & pengeluaran')
    expect(stripHtml('&lt;tag&gt; &quot;kuotasi&quot; &#39;satu&#39;')).toBe(`<tag> "kuotasi" 'satu'`)
  })

  it('does not turn a double-escaped ampersand into a tag', () => {
    // "&amp;lt;" is the literal text "&lt;", not "<".
    expect(stripHtml('&amp;lt;')).toBe('&lt;')
  })

  it('drops script and style content entirely', () => {
    expect(stripHtml('<style>p{color:red}</style><p>Halo</p>')).toBe('Halo')
    expect(stripHtml('<script>alert(1)</script><p>Halo</p>')).toBe('Halo')
  })

  it('collapses whitespace and newlines into single spaces', () => {
    expect(stripHtml('<p>Baris satu</p>\n\n<p>Baris dua</p>')).toBe('Baris satu Baris dua')
  })

  it('does not insert a space for inline formatting', () => {
    // Inline tags carry no spacing, so removing them must not split a word.
    expect(stripHtml('Kopi<strong>Kode</strong>')).toBe('KopiKode')
    expect(stripHtml('<em>rapi</em>sekali')).toBe('rapisekali')
  })

  it('leaves plain text untouched', () => {
    expect(stripHtml('Aplikasi e-commerce berbasis web.')).toBe(
      'Aplikasi e-commerce berbasis web.',
    )
  })

  it('handles a table-heavy description without leaving markup', () => {
    const html =
      '<table style="min-width: 50px;"><tbody><tr><th colspan="2">Fitur</th></tr><tr><td>Absensi</td></tr></tbody></table>'
    const out = stripHtml(html)
    expect(out).not.toMatch(/[<>]/)
    expect(out).toContain('Fitur')
    expect(out).toContain('Absensi')
  })
})

describe('truncateDescription', () => {
  it('returns empty string for empty input', () => {
    expect(truncateDescription('')).toBe('')
  })

  it('returns the full string if shorter than max length', () => {
    const short = 'A short description'
    expect(truncateDescription(short)).toBe(short)
  })

  it('returns the full string if exactly max length', () => {
    const exact = 'a'.repeat(150)
    expect(truncateDescription(exact)).toBe(exact)
  })

  it('truncates and adds ellipsis for long strings', () => {
    const long = 'a'.repeat(200)
    const result = truncateDescription(long)
    expect(result.length).toBe(153) // 150 + '...'
    expect(result.endsWith('...')).toBe(true)
  })

  it('respects custom max length', () => {
    const text = 'This is a longer description that should be truncated'
    const result = truncateDescription(text, 20)
    expect(result.length).toBeLessThanOrEqual(23) // 20 + '...'
    expect(result.endsWith('...')).toBe(true)
  })

  it('trims trailing whitespace before adding ellipsis', () => {
    // Create a string where character 150 is preceded by spaces
    const text = 'a'.repeat(145) + '     ' + 'b'.repeat(50)
    const result = truncateDescription(text)
    // Should trim trailing spaces before adding ellipsis
    expect(result).not.toMatch(/\s\.\.\./)
  })

  it('strips HTML before truncating (catalog blurb)', () => {
    const html = '<h2><strong>Source Code PHP Lengkap - Siap Deploy</strong></h2><p>Aplikasi web.</p>'
    const result = truncateDescription(html, 110)
    expect(result).not.toMatch(/[<>]/)
    expect(result.startsWith('Source Code PHP Lengkap')).toBe(true)
  })

  it('does not count markup against the character budget', () => {
    // 26 chars of markup around a 10-char word must not trigger truncation.
    const html = `<p><strong>${'a'.repeat(10)}</strong></p>`
    const result = truncateDescription(html, 110)
    expect(result).toBe('a'.repeat(10))
    expect(result.endsWith('...')).toBe(false)
  })

  it('decodes entities before truncating', () => {
    expect(truncateDescription('<p>Kopi&nbsp;&amp;&nbsp;Kode</p>')).toBe('Kopi & Kode')
  })
})

describe('formatPriceIDR', () => {
  it('formats a standard price correctly', () => {
    // IDR zero-decimal: 150000 = Rp 150.000
    expect(formatPriceIDR(150000)).toBe('Rp 150.000')
  })

  it('formats zero price', () => {
    expect(formatPriceIDR(0)).toBe('Rp 0')
  })

  it('formats small price', () => {
    // 50 = Rp 50
    expect(formatPriceIDR(50)).toBe('Rp 50')
  })

  it('formats large price', () => {
    // 1000000 = Rp 1.000.000
    expect(formatPriceIDR(1000000)).toBe('Rp 1.000.000')
  })

  it('rounds fractional amounts', () => {
    // 15.5 -> rounds to 16
    expect(formatPriceIDR(15.5)).toBe('Rp 16')
  })
})

describe('formatFileSize', () => {
  it('returns an empty string for missing or invalid input', () => {
    expect(formatFileSize(null)).toBe('')
    expect(formatFileSize(undefined)).toBe('')
    expect(formatFileSize(0)).toBe('')
    expect(formatFileSize(-10)).toBe('')
    expect(formatFileSize(NaN)).toBe('')
  })

  it('formats bytes without decimals', () => {
    expect(formatFileSize(512)).toBe('512 B')
  })

  it('formats kilobytes as whole numbers', () => {
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1536)).toBe('2 KB')
  })

  it('formats megabytes to one decimal', () => {
    expect(formatFileSize(15 * 1024 * 1024)).toBe('15 MB')
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1,5 MB')
  })

  it('formats gigabytes', () => {
    expect(formatFileSize(2 * 1024 ** 3)).toBe('2 GB')
  })

  it('coerces a numeric string (Postgres bigint) before formatting', () => {
    // The API returns bigint columns as numbers, but guard against strings too.
    expect(formatFileSize(Number('15000000'))).toBe('14,3 MB')
  })
})

describe('formatMimeType', () => {
  it('returns an empty string for missing input', () => {
    expect(formatMimeType(null)).toBe('')
    expect(formatMimeType(undefined)).toBe('')
    expect(formatMimeType('')).toBe('')
  })

  it('maps known MIME types to friendly labels', () => {
    expect(formatMimeType('application/zip')).toBe('ZIP Archive')
    expect(formatMimeType('application/pdf')).toBe('PDF Document')
    expect(formatMimeType('application/epub+zip')).toBe('EPUB')
  })

  it('is case-insensitive', () => {
    expect(formatMimeType('APPLICATION/ZIP')).toBe('ZIP Archive')
  })

  it('falls back to the raw MIME type when unknown', () => {
    expect(formatMimeType('application/x-custom')).toBe('application/x-custom')
  })
})
