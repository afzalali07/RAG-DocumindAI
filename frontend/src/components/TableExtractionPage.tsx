import { useState } from 'react'
import { ExtractionViewer } from './ExtractionViewer'
import { useI18n } from '../lib/i18n'
import type { DocumentItem, Source } from '../lib/types'

interface Props {
  documents: DocumentItem[]
  onManageDocuments: () => void
  onOpenSource: (source: Source) => void
}

export function TableExtractionPage({ documents, onManageDocuments, onOpenSource }: Props) {
  const { lang } = useI18n()
  const en = lang === 'en'
  const [selectedId, setSelectedId] = useState('')
  const [run, setRun] = useState<{ id: string; version: number } | null>(null)
  const selected = documents.find(doc => doc.id === selectedId && doc.status === 'ready')

  return <section className="table-extraction-page">
    <p>{en ? 'Choose an uploaded document, then extract its tables. Results include their page, section or worksheet.'
      : 'Выберите загруженный документ и извлеките таблицы с указанием страницы, раздела или листа.'}</p>
    <form className="table-extraction-form" onSubmit={event => {
      event.preventDefault()
      if (selected) setRun(previous => ({ id: selected.id, version: (previous?.version ?? 0) + 1 }))
    }}>
      <label htmlFor="table-document">{en ? 'Document to extract tables from' : 'Документ для извлечения таблиц'}</label>
      <select id="table-document" value={documents.some(doc => doc.id === selectedId) ? selectedId : ''}
        onChange={event => { setSelectedId(event.target.value); setRun(null) }}>
        <option value="">{en ? 'Choose a document' : 'Выберите документ'}</option>
        {documents.map(doc => <option key={doc.id} value={doc.id} disabled={doc.status !== 'ready'}>
          {doc.filename}{doc.status !== 'ready' ? ` (${doc.status})` : ''}
        </option>)}
      </select>
      <div className="table-extraction-actions">
        <button type="submit" className="btn btn-ghost" disabled={!selected}>{en ? 'Extract tables' : 'Извлечь таблицы'}</button>
        <button type="button" className="btn btn-ghost" onClick={onManageDocuments}>{en ? 'Upload / manage documents' : 'Загрузить документы'}</button>
      </div>
    </form>
    {!documents.length && <p>{en ? 'Upload a document to get started.' : 'Загрузите документ, чтобы начать.'}</p>}
    {!!documents.length && !documents.some(doc => doc.status === 'ready') && <p role="status">
      {en ? 'A document must finish processing before tables can be extracted.' : 'Дождитесь завершения обработки документа.'}
    </p>}
    {run && selected?.id === run.id && <ExtractionViewer key={`${run.id}-${run.version}`} embedded
      documentId={run.id} onClose={() => setRun(null)} onOpenSource={onOpenSource} />}
  </section>
}
