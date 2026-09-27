import { useCallback, useEffect, useState } from 'react'

export type Page = 'chat' | 'documents' | 'history' | 'table-extraction'
const pages: Page[] = ['chat', 'documents', 'history', 'table-extraction']
function readPage(): Page {
  const value = window.location.hash.slice(2) as Page
  return pages.includes(value) ? value : 'chat'
}
export function usePageRoute() {
  const [page, setPage] = useState<Page>(readPage)
  useEffect(() => {
    const sync = () => {
      const next = readPage()
      if (window.location.hash !== `#/${next}`) {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/${next}`)
      }
      setPage(next)
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  const navigate = useCallback((next: Page) => {
    window.location.hash = `/${next}`
    setPage(next)
  }, [])
  return { page, navigate }
}
