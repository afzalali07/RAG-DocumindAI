import { useEffect, useRef, useState } from 'react'
import { useChat } from '../hooks/useChat'
import { api } from '../lib/api'
import { useI18n } from '../lib/i18n'
import type { DocumentItem, Source } from '../lib/types'
import { MessageBubble } from './MessageBubble'

interface Props {
  documents: DocumentItem[]
  model: string
  onUploaded: () => void
  onFinished: () => void
  onInspect: (id: string) => void
  onOpenSource: (source: Source) => void
}

export function CompareView({ documents, model, onUploaded, onFinished, onInspect, onOpenSource }: Props) {
  const { lang } = useI18n()
  const en = lang === 'en'
  const [ids, setIds] = useState<[string, string]>(['', ''])
  const [question, setQuestion] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const { messages, isStreaming, send, stop, reset } = useChat({ conversationId, setConversationId, onFinished })
  useEffect(() => () => stop(), [stop])

  const selected = ids.map((id) => documents.find((doc) => doc.id === id))
  const ready = ids[0] !== ids[1] && selected.every((doc) => doc?.status === 'ready')
  const clear = () => { reset(); setConversationId(null); setError('') }

  const uploadPair = async (files: FileList) => {
    if (files.length !== 2) {
      setError(en ? 'Select exactly two files.' : 'Выберите ровно два файла.')
      return
    }
    clear()
    setUploading(true)
    const uploaded: string[] = []
    try {
      for (const file of Array.from(files)) {
        const doc = await api.uploadDocument(file, 'General')
        uploaded.push(doc.id)
        onUploaded()
      }
      setIds([uploaded[0], uploaded[1]])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      onUploaded()
      setUploading(false)
    }
  }

  const compare = (text?: string) => {
    if (!ready || isStreaming || uploading) return
    setError('')
    const prompt = text || question.trim() || (en
      ? 'Compare the main topics, similarities, differences, and table values in these two documents.'
      : 'Сравни темы, сходства, различия и значения таблиц в этих двух документах.')
    send(prompt, { model, documentIds: ids, lang, mode: 'compare' })
  }

  return <section className="compare-view">
    <div className="compare-heading"><div>
      <h1>{en ? 'Compare two documents' : 'Сравнить два документа'}</h1>
      <p>{en ? 'Choose existing files or upload a pair. Every reference keeps its own document and page.' : 'Выберите файлы или загрузите пару. Ссылки сохраняют документ и страницу.'}</p>
    </div><button className="btn btn-ghost" disabled={uploading || isStreaming} onClick={() => input.current?.click()}>
      {uploading ? (en ? 'Uploading…' : 'Загрузка…') : (en ? 'Upload two files' : 'Загрузить два файла')}
    </button><input ref={input} type="file" accept=".pdf,.docx,.xlsx" multiple hidden onChange={(event) => {
      if (event.target.files?.length) void uploadPair(event.target.files)
      event.target.value = ''
    }} /></div>
    <div className="compare-pair">
      {ids.map((id, index) => {
        const doc = selected[index]
        const ext = doc?.filename.split('.').pop()?.toLowerCase()
        const units = ext === 'pdf' ? (en ? 'pages' : 'страниц') : ext === 'xlsx' ? (en ? 'sheets' : 'листов') : (en ? 'sections' : 'разделов')
        return <div className="compare-file" key={index}>
          <label>{en ? 'Document' : 'Документ'} {index === 0 ? 'A' : 'B'}
            <select value={id} disabled={isStreaming || uploading} onChange={(event) => {
              clear()
              setIds(index === 0 ? [event.target.value, ids[1]] : [ids[0], event.target.value])
            }}><option value="">{en ? 'Select a document' : 'Выберите документ'}</option>
              {documents.map((item) => <option key={item.id} value={item.id} disabled={item.id === ids[1 - index] || item.status !== 'ready'}>
                {item.filename}{item.status !== 'ready' ? ` (${item.status})` : ''}
              </option>)}
            </select>
          </label>
          {doc && <p>{doc.status === 'ready' ? `${doc.page_count} ${units}` : doc.status === 'error' ? doc.error : (en ? 'Processing document…' : 'Обработка документа…')}</p>}
          {doc?.status === 'ready' && <button className="btn btn-ghost" onClick={() => onInspect(doc.id)}>{en ? 'Tables & pages' : 'Таблицы и страницы'}</button>}
        </div>
      })}
    </div>
    <form className="compare-form" onSubmit={(event) => { event.preventDefault(); compare() }}>
      <label htmlFor="compare-question">{en ? 'What should we compare? (optional)' : 'Что сравнить? (необязательно)'}</label>
      <textarea id="compare-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={en ? 'For example: prices, deadlines, or sustainability measures' : 'Например: цены, сроки, меры устойчивости'} rows={2} />
      <p className="extraction-note">{en ? 'Uses selected excerpts from both files. This is not a complete document diff. PDF pages, Word sections, and Excel sheets are tracked separately.' : 'Используются выбранные фрагменты обоих файлов. Это не полная проверка различий. Учитываются страницы PDF, разделы Word и листы Excel.'}</p>
      {model === 'mock' && <p className="extraction-note">{en ? 'Demo shows source excerpts. Select an available AI model above for an AI comparison.' : 'Демо показывает фрагменты. Для анализа выберите доступную AI-модель.'}</p>}
      {isStreaming ? <button className="btn btn-ghost" type="button" onClick={stop}>{en ? 'Stop comparison' : 'Остановить'}</button>
        : <button className="btn compare-submit" disabled={!ready || uploading}>{en ? 'Compare documents' : 'Сравнить документы'}</button>}
      {!ready && <p>{en ? 'Choose two different documents and wait for both to finish processing.' : 'Выберите два разных документа и дождитесь обработки.'}</p>}
      {error && <p className="docs-error" role="alert">{error}</p>}
    </form>
    <div className="messages compare-results" aria-live="polite">
      {messages.map((message, index) => <MessageBubble key={message.id} message={message} isLast={index === messages.length - 1}
        onOpenSource={onOpenSource} onFollowup={compare} onFeedback={(id, value) => { void api.messageFeedback(id, value) }} />)}
    </div>
  </section>
}
