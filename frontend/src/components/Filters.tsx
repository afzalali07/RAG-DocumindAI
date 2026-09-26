import { Dropdown, type DropdownOption } from './Dropdown'
import { IconBot } from '../lib/icons'
import { useI18n } from '../lib/i18n'
import type { ChatMode } from '../lib/types'

interface Props {
  categories: string[]
  category: string
  onCategoryChange: (c: string) => void
  mode: ChatMode
  onModeChange: (mode: ChatMode) => void
}


/** Mode selector, shared by desktop and mobile. */
export function Filters({
  mode,
  onModeChange,
}: Props) {
  const { t, lang } = useI18n()

  const modeOptions: DropdownOption[] = [
    { value: 'compare', label: lang === 'en' ? 'Compare documents' : 'Сравнение документов', hint: lang === 'en' ? 'Two files with source references' : 'Два файла со ссылками' },
    { value: 'rag', label: t('modeRag'), hint: t('modeRagHint') },
    { value: 'agent', label: t('modeAgent'), hint: t('modeAgentHint') },
    { value: 'search', label: t('modeSearch'), hint: t('modeSearchHint') },
  ]



  return (
    <>
      <Dropdown
        value={mode}
        options={modeOptions}
        onChange={(v) => onModeChange(v as ChatMode)}
        icon={<IconBot width={16} height={16} />}
        label={t('mode')}
      />

    </>
  )
}
