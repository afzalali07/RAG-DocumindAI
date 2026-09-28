import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { api } from '../lib/api'
import { chatReport, tableReport } from '../lib/reports'
import type { Conversation, ConversationDetail, DocumentItem } from '../lib/types'

interface Props { documents: DocumentItem[]; conversations: Conversation[] }
export function ReportsPage({ documents, conversations }: Props) {
  const [kind, setKind] = useState<'chat' | 'tables'>('chat')
  const [documentId, setDocumentId] = useState('')
  const [conversationId, setConversationId] = useState('')
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [answerIds, setAnswerIds] = useState<string[]>([])
  const [title, setTitle] = useState('Document report')
  const [report, setReport] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const version = useRef(0)
  const preview = useRef<HTMLElement>(null)
  const selected = documents.find(d => d.id === documentId)
  const available = conversations.filter(c => c.document_ids?.includes(documentId))
  const clear = () => { version.current++; setReport(''); setError(''); setBusy(false) }
  useEffect(() => {
    let active = true
    setDetail(null); setAnswerIds([])
    if (!conversationId) return
    setBusy(true)
    api.getConversation(conversationId).then(result => {
      if (!active) return
      setDetail(result)
      setAnswerIds(result.messages.filter(m => m.role === 'assistant' && m.content.trim()).map(m => m.id))
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load answers.') })
      .finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [conversationId])
  useEffect(() => () => { version.current++ }, [])

  const generate = async () => {
    if (!selected || busy) return
    const current = ++version.current
    setBusy(true); setError(''); setReport('')
    try {
      const body = kind === 'tables' ? tableReport(await api.documentExtraction(documentId))
        : detail && detail.document_ids?.includes(documentId) && answerIds.length ? chatReport(detail, answerIds) : ''
      if (!body) throw new Error('Choose a conversation and at least one answer.')
      if (version.current !== current) return
      const names = kind === 'chat' ? (detail?.document_ids ?? []).map(id => documents.find(d => d.id === id)?.filename ?? `Unavailable document (${id})`) : [selected.filename]
      setReport(`# ${title.trim() || 'Document report'}\n\nGenerated: ${new Date().toLocaleString()}\n\nFeature: ${kind === 'tables' ? 'Table Extraction' : 'Saved chat / analysis answers'}\n\nDocuments: ${names.join(', ')}\n\n${body}\n\n---\n\nCompiled from ${kind === 'tables' ? 'extracted tables; detection may omit scanned or borderless tables' : 'selected saved answers; their accuracy has not been independently verified'}.`)
    } catch (err) { if (version.current === current) setError(err instanceof Error ? err.message : 'Report generation failed.') }
    finally { if (version.current === current) setBusy(false) }
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([report], { type: 'text/markdown;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'document-report.md'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const print = () => {
    const target = window.open('', '_blank')
    if (!target) { setError('Allow pop-ups to print or save the report as PDF.'); return }
    target.opener = null
    target.document.title = 'Document report'
    const style = target.document.createElement('style')
    style.textContent = 'body{font:14px Arial,sans-serif;padding:32px;line-height:1.6;color:#111}table{border-collapse:collapse;width:100%;font-size:11px}td,th{border:1px solid #aaa;padding:6px;overflow-wrap:anywhere}pre{white-space:pre-wrap}h1,h2,h3{break-after:avoid}img{max-width:100%}@page{margin:15mm}'
    target.document.head.append(style)
    if (preview.current) target.document.body.append(preview.current.cloneNode(true))
    target.focus(); target.print()
  }
  return <section className="reports-page">
    <p>Create a report from extracted tables or selected saved answers, including document references.</p>
    <div className="report-controls">
      <label>Report title<input value={title} onChange={e => { setTitle(e.target.value); clear() }} /></label>
      <label>Document<select value={documentId} onChange={e => { clear(); setDocumentId(e.target.value); setConversationId(''); setDetail(null); setAnswerIds([]) }}>
        <option value="">Choose a document</option>{documents.map(d => <option key={d.id} value={d.id}>{d.filename}</option>)}
      </select></label>
      <label>Report source<select value={kind} onChange={e => { clear(); setKind(e.target.value as typeof kind) }}>
        <option value="chat">Saved chat / analysis answers</option><option value="tables">Table Extraction</option>
      </select></label>
      {kind === 'chat' && <label>Conversation<select value={conversationId} disabled={!documentId} onChange={e => { clear(); setDetail(null); setConversationId(e.target.value) }}>
        <option value="">Choose a conversation</option>{available.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
      </select></label>}
      {kind === 'chat' && documentId && !available.length && <p>No saved conversations for this document. Ask a question in Chat first, or choose Table Extraction.</p>}
      {kind === 'chat' && detail && <fieldset><legend>Answers to include</legend>
        {detail.messages.filter(m => m.role === 'assistant' && m.content.trim()).map(m => <label className="report-answer" key={m.id}>
          <input type="checkbox" checked={answerIds.includes(m.id)} onChange={e => { clear(); setAnswerIds(ids => e.target.checked ? [...ids, m.id] : ids.filter(id => id !== m.id)) }} />
          <span>{m.content.slice(0, 220)}{m.content.length > 220 ? '…' : ''}</span>
        </label>)}
        {!detail.messages.some(m => m.role === 'assistant' && m.content.trim()) && <p>No saved answers yet.</p>}
        {(detail.document_ids?.length ?? 0) > 1 && <p>This conversation compares multiple documents. The report includes the full selected answers and identifies all documents.</p>}
      </fieldset>}
      <button className="btn btn-ghost" disabled={busy || !selected || (kind === 'chat' ? !detail || !answerIds.length : selected.status !== 'ready')} onClick={generate}>{busy ? 'Loading…' : 'Generate report'}</button>
    </div>
    {error && <p role="alert" className="docs-error">{error}</p>}
    {report && <><div className="report-actions"><button className="btn btn-ghost" onClick={download}>Download Markdown</button><button className="btn btn-ghost" onClick={print}>Print / Save as PDF</button></div>
      <article ref={preview} className="report-preview"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: () => null }}>{report}</ReactMarkdown></article></>}
  </section>
}
