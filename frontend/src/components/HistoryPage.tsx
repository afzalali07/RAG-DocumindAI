import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import { IconTrash } from '../lib/icons'
import type { Conversation } from '../lib/types'

export function HistoryPage({ conversations, activeId, onOpen, onDelete }: {
  conversations: Conversation[]
  activeId: string | null
  onOpen: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const { lang, t } = useI18n()
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (action: () => Promise<void>) => {
    setError(''); setBusy(true)
    try { await action() } catch { setError(lang === 'en' ? 'Could not update the conversation. Please retry.' : 'Не удалось обновить чат. Повторите попытку.') }
    finally { setBusy(false) }
  }
  const filtered = conversations.filter(c => c.title.toLowerCase().includes(query.toLowerCase()))
  return <section className="history-page">
    <label htmlFor="history-search">{lang === 'en' ? 'Search conversations' : 'Поиск чатов'}</label>
    <input id="history-search" value={query} onChange={e => setQuery(e.target.value)} type="search" />
    {error && <p role="alert">{error}</p>}
    {!filtered.length && <p>{query ? (lang === 'en' ? 'No matching conversations.' : 'Ничего не найдено.') : t('historyEmpty')}</p>}
    <ul className="history-list">{filtered.map(c => <li key={c.id} className={c.id === activeId ? 'active' : ''}>
      <button className="history-open" disabled={busy} onClick={() => run(() => onOpen(c.id))}>
        <strong>{c.title}</strong><time dateTime={c.updated_at}>{new Date(c.updated_at).toLocaleString(lang)}</time>
      </button>
      <button className="history-delete" disabled={busy} aria-label={`${t('deleteConversation')}: ${c.title}`} onClick={() => run(() => onDelete(c.id))}><IconTrash /></button>
    </li>)}</ul>
  </section>
}
