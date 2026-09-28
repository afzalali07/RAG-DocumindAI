import type { ConversationDetail, DocumentExtraction } from './types'

const cell = (value: string) => value.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')
export function tableReport(data: DocumentExtraction): string {
  const parts = [`## Document findings`, `Document: ${data.filename}`, `Locations: ${data.page_count} · Tables detected: ${data.table_count}`]
  for (const page of data.pages) {
    parts.push(`### ${data.location_kind} ${page.page}${page.label ? ` — ${page.label}` : ''}`)
    parts.push(...page.warnings.map(w => `Note: ${w}`))
    for (const table of page.tables) {
      parts.push(`#### ${table.title}`)
      const width = Math.max(0, ...table.rows.map(row => row.length))
      if (!width) continue
      const rows = table.rows.map(row => '| ' + Array.from({ length: width }, (_, i) => cell(row[i] ?? '')).join(' | ') + ' |')
      parts.push(rows[0], '| ' + Array(width).fill('---').join(' | ') + ' |', ...rows.slice(1), '')
    }
    if (!page.tables.length) parts.push('No tables detected at this location.')
  }
  return parts.join('\n\n').replace(/\|\n\n\|/g, '|\n|')
}
export function chatReport(conversation: ConversationDetail, answerIds: string[]): string {
  const parts = [`## Conversation findings`, `Conversation: ${conversation.title}`]
  let question = ''
  for (const message of conversation.messages) {
    if (message.role === 'user') question = message.content
    if (message.role !== 'assistant' || !answerIds.includes(message.id)) continue
    parts.push(`### Question`, question, `### Saved answer`, message.content)
    if (message.sources?.length) {
      parts.push('#### Sources for this answer')
      parts.push(...message.sources.map((source, i) => `${i + 1}. ${source.filename}${source.page != null ? ` — ${source.location_kind ?? 'page'} ${source.page}` : ''}${source.label ? ` (${source.label})` : ''}`))
    } else parts.push('No source references were saved with this answer.')
  }
  return parts.join('\n\n')
}
