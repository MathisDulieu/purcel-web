import { EmojiPicker } from 'frimousse'
import { useTranslation } from 'react-i18next'
import { Spinner } from '@/components/ui'

export const QUICK_REACTIONS = ['\u{1F437}', '\u{1F602}', '\u{2764}\u{FE0F}', '\u{1F44D}', '\u{1F62E}', '\u{1F389}']

const PICKER_LOCALES: Record<string, string> = { en: 'en', fr: 'fr', ro: 'en' }

export function EmojiPanel({ onSelect }: { onSelect: (emoji: string) => void }) {
  const { t, i18n } = useTranslation()
  return (
    <EmojiPicker.Root
      onEmojiSelect={({ emoji }) => onSelect(emoji)}
      locale={PICKER_LOCALES[i18n.resolvedLanguage ?? 'en'] ?? 'en'}
      columns={8}
      className="isolate flex h-[22rem] w-[min(21rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[1.4rem] border border-line bg-surface shadow-card"
    >
      <EmojiPicker.Search className="field m-2 w-auto! py-2!" placeholder={t('common.search')} />
      <EmojiPicker.Viewport className="relative flex-1 outline-none">
        <EmojiPicker.Loading className="absolute inset-0 grid place-items-center">
          <Spinner />
        </EmojiPicker.Loading>
        <EmojiPicker.Empty className="absolute inset-0 grid place-items-center text-sm text-ink-soft">{t('chat.noEmoji')}</EmojiPicker.Empty>
        <EmojiPicker.List
          className="pb-2 select-none"
          components={{
            CategoryHeader: ({ category, ...props }) => (
              <div className="bg-surface px-3 pt-2 pb-1 text-xs font-semibold text-ink-soft" {...props}>
                {category.label}
              </div>
            ),
            Row: ({ children, ...props }) => (
              <div className="scroll-my-1 px-1.5" {...props}>
                {children}
              </div>
            ),
            Emoji: ({ emoji, ...props }) => (
              <button
                className="grid size-9 place-items-center rounded-xl text-2xl data-[active]:bg-surface-2"
                {...props}
              >
                {emoji.emoji}
              </button>
            ),
          }}
        />
      </EmojiPicker.Viewport>
    </EmojiPicker.Root>
  )
}
