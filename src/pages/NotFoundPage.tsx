import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { PigAvatar } from '@/components/PigAvatar'
import { buttonClass } from '@/components/ui'
import { Page } from '@/components/AppShell'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <Page>
      <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
        <PigAvatar avatar={21} size={120} />
        <h1 className="mt-6 font-display text-6xl font-black">{t('notFound.title')}</h1>
        <p className="mt-2 max-w-sm text-ink-soft">{t('notFound.text')}</p>
        <Link to="/" className={buttonClass('primary', 'md', 'mt-6')}>
          {t('notFound.back')}
        </Link>
      </div>
    </Page>
  )
}
