import { IconChat, IconDoc, IconPlus, IconSpark, IconSun, IconMoon } from '../lib/icons'
import { useSwipeDismiss } from '../hooks/useSwipeDismiss'
import { useI18n } from '../lib/i18n'
import type { Page } from '../hooks/usePageRoute'

interface Props {
  open: boolean
  onClose: () => void
  onNew: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  page: Page
}
export function Sidebar({ open, onClose, onNew, theme, onToggleTheme, page }: Props) {
  const { t, lang } = useI18n()
  const swipe = useSwipeDismiss(onClose, 'left', open)
  const links = [
    { page: 'chat', label: lang === 'en' ? 'Chat' : 'Чат', icon: <IconChat /> },
    { page: 'documents', label: lang === 'en' ? 'Documents & uploads' : 'Документы и загрузка', icon: <IconDoc /> },
    { page: 'history', label: lang === 'en' ? 'Chat history' : 'История чатов', icon: <IconChat /> },
  ]
  return <aside className={`sidebar ${open ? 'open' : ''} ${swipe.swiping ? 'swiping' : ''}`} style={swipe.style} {...swipe.handlers}>
    <div className="brand">
      <div className="brand-logo"><IconSpark width={20} height={20} /></div>
      <div><div className="brand-title">RAG Chat</div><div className="brand-sub">{t('brandSub')}</div></div>
      <button className="sidebar-close" onClick={onClose} aria-label={t('hidePanel')}>×</button>
    </div>
    <button className="btn-new" onClick={onNew}><IconPlus />{t('newChat')}</button>
    <nav className="page-nav" aria-label={lang === 'en' ? 'Main navigation' : 'Навигация'}>
      {links.map(link => <a key={link.page} href={`#/${link.page}`} onClick={onClose}
        className={page === link.page ? 'active' : ''} aria-current={page === link.page ? 'page' : undefined}>
        {link.icon}{link.label}
      </a>)}
    </nav>
    <div className="sidebar-footer">
      <button className="theme-toggle theme-icon" onClick={onToggleTheme}
        title={theme === 'dark' ? t('themeLight') : t('themeDark')}
        aria-label={theme === 'dark' ? t('themeLight') : t('themeDark')}>
        {theme === 'dark' ? <IconSun width={18} height={18} aria-hidden="true" /> : <IconMoon width={18} height={18} aria-hidden="true" />}
      </button>
    </div>
  </aside>
}
