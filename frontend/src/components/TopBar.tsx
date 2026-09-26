import { Filters } from './Filters'
import { IconDoc, IconMenu } from '../lib/icons'
import { useI18n } from '../lib/i18n'
import type { ChatMode } from '../lib/types'

interface Props {
  categories: string[]
  category: string
  onCategoryChange: (c: string) => void
  mode: ChatMode
  onModeChange: (mode: ChatMode) => void
  docsOpen: boolean
  onToggleDocs: () => void
  readyDocs: number
  onMenu: () => void
}

export function TopBar({
  categories,
  category,
  onCategoryChange,
  mode,
  onModeChange,
  docsOpen,
  onToggleDocs,
  readyDocs,
  onMenu,
}: Props) {
  const { t } = useI18n()
  return (
    <header className="topbar">
      <button className="menu-btn" onClick={onMenu} title={t('menuTitle')}>
        <IconMenu width={18} height={18} />
      </button>

      {/* Desktop: selectors live in the bar. On mobile they move into the drawer. */}
      <div className="topbar-left">
        <Filters



          categories={categories}
          category={category}
          onCategoryChange={onCategoryChange}
          mode={mode}
          onModeChange={onModeChange}
        />
      </div>

      {!docsOpen && (
        <button
          className="docs-toggle"
          onClick={onToggleDocs}
          title={t('documents')}
        >
          <IconDoc width={16} height={16} />
          {t('documents')}
          <span className="docs-count">{readyDocs}</span>
        </button>
      )}
    </header>
  )
}
