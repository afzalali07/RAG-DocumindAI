import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useI18n } from '../lib/i18n'
import type { DocumentExtraction, Source } from '../lib/types'

interface Props {
  documentId: string
  initialPage?: number
  onClose: () => void
  onOpenSource: (source: Source) => void
}

export function ExtractionViewer({ documentId, initialPage = 1, onClose, onOpenSource }: Props) {
  const { lang } = useI18n()
  const en = lang === 'en'
  const [data, setData] = useState<DocumentExtraction | null>(null)
  const [error, setError] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [tab, setTab] = useState<'tables' | 'text'>('tables')
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = dialog.current
    el?.showModal()
    return () => el?.close()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setData(null)
    setError('')
    api.documentExtraction(documentId, controller.signal).then((result) => {
      setData(result)
      setPageIndex(Math.max(0, result.pages.findIndex((page) => page.page === initialPage)))
    }).catch((err: unknown) => {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Extraction failed')
    })
    return () => controller.abort()
  }, [documentId, initialPage])

  const page = data?.pages[pageIndex]
  const unit = data?.location_kind === 'sheet' ? (en ? 'Sheet' : 'Лист')
    : data?.location_kind === 'section' ? (en ? 'Section' : 'Раздел') : (en ? 'Page' : 'Страница')

  return (
    <dialog ref={dialog} className="extraction-dialog" onCancel={onClose} aria-labelledby="extraction-title">
      <header className="extraction-head">
        <div><h2 id="extraction-title">{en ? 'Tables & pages' : 'Таблицы и страницы'}</h2><p>{data?.filename}</p></div>
        <button className="btn btn-ghost" onClick={onClose} aria-label={en ? 'Close' : 'Закрыть'} autoFocus>✕</button>
      </header>
      {error && <p className="docs-error" role="alert">{error}</p>}
      {!data && !error && <p role="status">{en ? 'Extracting document…' : 'Извлечение документа…'}</p>}
      {data && page && <>
        <p className="extraction-note">
          {data.page_count} {unit.toLowerCase()}{en ? '(s)' : ''} · {data.table_count} {en ? 'table(s)' : 'таблиц'}
          {data.location_kind === 'section' && (en ? ' · Word uses logical sections, not printed pages.' : ' · Word: логические разделы, не печатные страницы.')}
          {data.location_kind === 'sheet' && (en ? ' · Excel locations are worksheets. Formula values use the saved workbook cache.' : ' · Excel: листы книги. Формулы используют сохранённые значения.')}
          {data.location_kind === 'page' && (en ? ' · PDF table detection uses cell borders. Scans require OCR; borderless tables may not be detected.' : ' · Таблицы PDF определяются по границам ячеек. Для сканов нужен OCR.')}
        </p>
        <nav className="extraction-nav" aria-label={en ? 'Document pages' : 'Страницы документа'}>
          <button className="btn btn-ghost" aria-label={en ? 'Previous location' : 'Предыдущая страница'} disabled={pageIndex === 0} onClick={() => setPageIndex(pageIndex - 1)}>←</button>
          <label>{unit} <select value={pageIndex} onChange={(event) => setPageIndex(Number(event.target.value))}>
            {data.pages.map((item, index) => <option key={item.page} value={index}>
              {item.page} / {data.page_count}{data.location_kind === 'sheet' ? ` — ${item.label}` : ''} · {item.tables.length} {en ? 'tables' : 'таблиц'}
            </option>)}
          </select></label>
          <button className="btn btn-ghost" aria-label={en ? 'Next location' : 'Следующая страница'} disabled={pageIndex === data.pages.length - 1} onClick={() => setPageIndex(pageIndex + 1)}>→</button>
          <button className="btn btn-ghost" onClick={() => {
            onClose()
            onOpenSource({ document_id: data.document_id, filename: data.filename, page: page.page,
              label: page.label, location_kind: data.location_kind, snippet: '', score: null, chunk_index: null })
          }}>{en ? 'Open original' : 'Открыть оригинал'}</button>
        </nav>
        <div className="extraction-tabs">
          <button className="btn btn-ghost" aria-pressed={tab === 'tables'} onClick={() => setTab('tables')}>{en ? 'Tables' : 'Таблицы'} ({page.tables.length})</button>
          <button className="btn btn-ghost" aria-pressed={tab === 'text'} onClick={() => setTab('text')}>{en ? 'Extracted text' : 'Извлечённый текст'}</button>
        </div>
        <div className="extraction-content" key={page.page}>
          {page.warnings.map((warning) => <p className="extraction-note" key={warning}>{warning}</p>)}
          {tab === 'text' ? <pre>{page.text || (en ? 'No extractable text on this page.' : 'Нет извлекаемого текста.')}</pre> : <>
            {!page.tables.length && <p>{en ? 'No tables detected at this location. Check the extracted text or original document.' : 'Таблицы не найдены. Проверьте текст или оригинал.'}</p>}
            {page.tables.map((table, index) => <div className="extracted-table" key={index}>
              <table><caption>{data.filename} · {unit} {page.page} · {table.title}</caption>
                <tbody>{table.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody>
              </table>
            </div>)}
          </>}
        </div>
      </>}
    </dialog>
  )
}
