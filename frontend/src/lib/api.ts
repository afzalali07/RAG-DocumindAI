import type {
  Conversation,
  ConversationDetail,
  DocumentItem,
  DocumentExtraction,
  ModelInfo,
  SearchResponse,
} from './types'

const BASE = '/api'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail ?? detail
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

export const api = {
  // ---- Models ----
  listModels: () => fetch(`${BASE}/models`).then(json<ModelInfo[]>),

  // ---- Documents ----
  listDocuments: (category?: string) => {
    const q = category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : ''
    return fetch(`${BASE}/documents${q}`).then(json<DocumentItem[]>)
  },
  listCategories: () => fetch(`${BASE}/documents/categories`).then(json<string[]>),
  uploadDocument: (file: File, category: string) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('category', category)
    return fetch(`${BASE}/documents`, { method: 'POST', body: fd }).then(json<DocumentItem>)
  },
  deleteDocument: (id: string) =>
    fetch(`${BASE}/documents/${id}`, { method: 'DELETE' }).then(json<void>),
  loadDemoDocuments: () =>
    fetch(`${BASE}/documents/demo`, { method: 'POST' }).then(json<DocumentItem[]>),
  documentFileUrl: (id: string) => `${BASE}/documents/${id}/file`,
  documentExtraction: (id: string, signal?: AbortSignal) =>
    fetch(`${BASE}/documents/${id}/extraction`, { signal }).then(json<DocumentExtraction>),

  // ---- Vector search ----
  search: (q: string, opts?: { category?: string; top_k?: number; documentIds?: string[]; signal?: AbortSignal }) => {
    const p = new URLSearchParams({ q })
    if (opts?.category && opts.category !== 'All') p.set('category', opts.category)
    if (opts?.top_k) p.set('top_k', String(opts.top_k))
    if (opts?.documentIds) p.set('document_ids', opts.documentIds.join(','))
    return fetch(`${BASE}/search?${p}`, { signal: opts?.signal }).then(json<SearchResponse>)
  },

  // ---- Conversations ----
  listConversations: () => fetch(`${BASE}/conversations`).then(json<Conversation[]>),
  getConversation: (id: string) =>
    fetch(`${BASE}/conversations/${id}`).then(json<ConversationDetail>),
  messageFeedback: (messageId: string, value: 'up' | 'down' | null) =>
    fetch(`${BASE}/messages/${messageId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    }).then(json<{ id: string; feedback: string | null }>),
  renameConversation: (id: string, title: string) =>
    fetch(`${BASE}/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).then(json<Conversation>),
  deleteConversation: (id: string) =>
    fetch(`${BASE}/conversations/${id}`, { method: 'DELETE' }).then(json<void>),
}
