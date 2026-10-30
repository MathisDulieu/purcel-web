import { useId } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Moon, Sun } from 'lucide-react'
import { FR, GB, RO } from 'country-flag-icons/react/3x2'
import clsx from 'clsx'
import { useQueryClient } from '@tanstack/react-query'
import { api, getToken } from '@/lib/api'
import i18n, { LANGUAGES, rememberLanguage } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import type { Language, UserProfile } from '@/lib/types'

const FLAGS = { en: GB, fr: FR, ro: RO }
const NAMES = { en: 'English', fr: 'Français', ro: 'Română' }

export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { i18n: instance } = useTranslation()
  const client = useQueryClient()
  const group = useId()
  const current = (instance.resolvedLanguage ?? 'en') as Language

  const change = (language: Language) => {
    if (language === current) return
    void i18n.changeLanguage(language)
    rememberLanguage(language)
    if (getToken()) {
      void api<UserProfile>('/api/me/language', { method: 'PUT', json: { language } })
        .then((user) => client.setQueryData(['me'], user))
        .catch(() => undefined)
    }
  }

  return (
    <div role="radiogroup" aria-label="Language" className="inline-flex items-center gap-1 rounded-full bg-surface-2 p-1">
      {LANGUAGES.map((language) => {
        const Flag = FLAGS[language]
        const active = language === current
        return (
          <button
            key={language}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={NAMES[language]}
            title={NAMES[language]}
            onClick={() => change(language)}
            className={clsx('relative grid place-items-center rounded-full', compact ? 'h-8 w-10' : 'h-9 w-12')}
          >
            {active ? (
              <motion.span
                layoutId={`flag-${group}`}
                className="absolute inset-0 rounded-full bg-surface shadow-card"
                transition={{ type: 'spring', stiffness: 520, damping: 34 }}
              />
            ) : null}
            <Flag
              className={clsx(
                'relative w-6 overflow-hidden rounded-[3px] transition-[filter,opacity] duration-200',
                active ? 'opacity-100' : 'opacity-60 grayscale-[0.5] hover:opacity-90',
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const { t } = useTranslation()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        toggle({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      }}
      aria-label={dark ? t('nav.lightMode') : t('nav.darkMode')}
      title={dark ? t('nav.lightMode') : t('nav.darkMode')}
      className={clsx('relative grid size-10 place-items-center overflow-hidden rounded-full bg-surface-2 text-ink hover:bg-surface-3', className)}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={theme}
          initial={{ y: 18, rotate: -90, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          exit={{ y: -18, rotate: 90, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 26 }}
          className="grid place-items-center"
        >
          {dark ? <Moon className="size-[1.15rem]" strokeWidth={2.2} /> : <Sun className="size-[1.15rem]" strokeWidth={2.2} />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
