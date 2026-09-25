import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../lib/i18n'
import type { DocumentItem } from '../lib/types'

interface Props {
  documents: DocumentItem[]
  onSelect: (id: string) => void
  onClose: () => void
  onUpload: () => void
}

export function DocumentPicker({ documents, onSelect, onClose, onUpload }: Props) {
  const { lang } = useI18n()
  const en = lang === 'en'
  const dialog = useRef<HTMLDialogElement>(null)
  const [query, setQuery] = useState('')
  const filtered = documents.filter((doc) => doc.filename.toLowerCase().includes(query.trim().toLowerCase()))

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  return <dialog ref={dialog} className="document-picker" onCancel={onClose} aria-labelledby="document-picker-title">
    <header className="extraction-head">
      <h2 id="document-picker-title">{en ? 'Choose a document' : 'Выберите документ'}</h2>
      <button type="button" className="btn btn-ghost" onClick={onClose} aria-label={en ? 'Close' : 'Закрыть'}>✕</button>
    </header>
    <input className="document-picker-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
      placeholder={en ? 'Search uploaded documents…' : 'Поиск загруженных документов…'}
      aria-label={en ? 'Search uploaded documents' : 'Поиск загруженных документов'} autoFocus />
    <div className="document-picker-list">
      {filtered.map((doc) => <button type="button" className="document-picker-item" key={doc.id}
        disabled={doc.status !== 'ready'} onClick={() => onSelect(doc.id)}>
        <strong>{doc.filename}</strong>
        <span>{doc.category} · {doc.status === 'ready'
          ? (en ? 'Ready to select' : 'Готов к выбору')
          : doc.status === 'processing' ? (en ? 'Processing…' : 'Обработка…')
            : (en ? 'Processing failed' : 'Ошибка обработки')}</span>
      </button>)}
      {!filtered.length && <p>{documents.length
        ? (en ? 'No matching documents.' : 'Документы не найдены.')
        : (en ? 'Upload a document to get started.' : 'Загрузите документ для начала.')}</p>}
    </div>
    <button type="button" className="btn btn-ghost" onClick={onUpload}>{en ? 'Upload / manage documents' : 'Загрузить / выбрать документы'}</button>
  </dialog>
}
