/**
 * A minimal document model shared by every output.
 *
 * Builders produce this; renderers turn it into HTML for screen and print. The
 * split matters because the evidence package must be reproducible: the same
 * record must always produce the same document, and a document model that is
 * pure data can be hashed and compared, whereas a stream of markup cannot be.
 *
 * PDF today is produced by printing the rendered HTML, which keeps what a
 * regulator receives byte-identical to what the inspector approved on screen.
 * A headless generator is noted as outstanding in HANDOVER.md.
 */

export interface FieldRow {
  label: string
  value: string
  /** Rendered in a monospaced column - hashes, references, identifiers. */
  mono?: boolean
}

export interface DocumentTable {
  columns: string[]
  rows: string[][]
}

export interface DocumentSection {
  heading: string
  /** Short note under the heading explaining what the section is for. */
  note?: string
  fields?: FieldRow[]
  paragraphs?: string[]
  table?: DocumentTable
}

export interface RenderedDocument {
  documentType: string
  title: string
  subtitle: string
  sections: DocumentSection[]
  /** Printed at the foot of every page. */
  footer: string
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

function renderSection(section: DocumentSection): string {
  const parts: string[] = [`<h2>${escapeHtml(section.heading)}</h2>`]
  if (section.note) parts.push(`<p class="note">${escapeHtml(section.note)}</p>`)
  if (section.paragraphs?.length) {
    for (const paragraph of section.paragraphs) {
      parts.push(`<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    }
  }
  if (section.fields?.length) {
    parts.push('<dl>')
    for (const field of section.fields) {
      parts.push(
        `<dt>${escapeHtml(field.label)}</dt><dd${field.mono ? ' class="mono"' : ''}>${escapeHtml(field.value)}</dd>`,
      )
    }
    parts.push('</dl>')
  }
  if (section.table) {
    parts.push('<table><thead><tr>')
    for (const column of section.table.columns) parts.push(`<th>${escapeHtml(column)}</th>`)
    parts.push('</tr></thead><tbody>')
    for (const row of section.table.rows) {
      parts.push('<tr>')
      for (const cell of row) parts.push(`<td>${escapeHtml(cell)}</td>`)
      parts.push('</tr>')
    }
    parts.push('</tbody></table>')
  }
  return `<section>${parts.join('')}</section>`
}

export function renderDocumentHtml(document: RenderedDocument): string {
  return [
    `<article class="doc" data-document-type="${escapeHtml(document.documentType)}">`,
    `<header><h1>${escapeHtml(document.title)}</h1><p class="subtitle">${escapeHtml(document.subtitle)}</p></header>`,
    document.sections.map(renderSection).join(''),
    `<footer>${escapeHtml(document.footer)}</footer>`,
    '</article>',
  ].join('')
}

/** Plain text, for the manifest and for diffing two exports of the same record. */
export function renderDocumentText(document: RenderedDocument): string {
  const lines: string[] = [document.title, document.subtitle, '']
  for (const section of document.sections) {
    lines.push(`## ${section.heading}`)
    if (section.note) lines.push(`(${section.note})`)
    for (const paragraph of section.paragraphs ?? []) lines.push(paragraph)
    for (const field of section.fields ?? []) lines.push(`${field.label}: ${field.value}`)
    if (section.table) {
      lines.push(section.table.columns.join(' | '))
      for (const row of section.table.rows) lines.push(row.join(' | '))
    }
    lines.push('')
  }
  lines.push(document.footer)
  return lines.join('\n')
}
