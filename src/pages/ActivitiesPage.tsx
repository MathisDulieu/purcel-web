import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Clock, MapPin, Plus, Search, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { fileUrl } from '@/lib/api'
import { ACTIVITY_META } from '@/lib/categories'
import { useSync } from '@/lib/data'
import { formatDuration, formatPrice } from '@/lib/format'
import { useOnline } from '@/lib/online'
import { ACTIVITY_CATEGORIES, type Activity, type ActivityCategory } from '@/lib/types'
import { Page, PageHeader } from '@/components/AppShell'
import { Button, EmptyState, Spinner } from '@/components/ui'
import { ActivityFormSheet } from '@/components/activities/ActivityForm'

function normalize(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

function ActivityCard({ activity, index }: { activity: Activity; index: number }) {
  const { t } = useTranslation()
  const meta = ACTIVITY_META[activity.category]
  const cover = activity.photoIds[0]
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), type: 'spring', stiffness: 260, damping: 26 }}
    >
      <Link to={`/activities/${activity.id}`} className="group flex h-full flex-col overflow-hidden rounded-[1.6rem] bg-surface shadow-card">
        <div className="relative aspect-[4/3] overflow-hidden">
          {cover ? (
            <motion.img
              layoutId={`activity-cover-${activity.id}`}
              src={fileUrl(cover)}
              alt=""
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="grid size-full place-items-center" style={{ backgroundColor: `color-mix(in oklab, ${meta.color} 22%, var(--surface))` }}>
              <meta.icon className="size-14 opacity-70" style={{ color: meta.color }} strokeWidth={1.6} />
            </div>
          )}
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{ backgroundColor: meta.color }}>
            <meta.icon className="size-3.5" />
            {t(`activityCategory.${activity.category}`)}
          </span>
          {activity.photoIds.length > 1 ? (
            <span className="absolute right-3 bottom-3 rounded-full bg-ink/75 px-2 py-0.5 text-xs font-bold text-bg">+{activity.photoIds.length - 1}</span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <h2 className="font-display text-[1.7rem] leading-[0.95] font-extrabold">{activity.name}</h2>
          {activity.description ? <p className="line-clamp-2 text-sm text-ink-soft">{activity.description}</p> : null}
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs font-semibold text-ink-soft">
            {activity.durationMinutes ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" />
                {formatDuration(activity.durationMinutes)}
              </span>
            ) : null}
            {activity.price !== null ? <span>{formatPrice(activity.price, activity.currency)}</span> : null}
            {activity.address ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">{activity.address}</span>
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </motion.li>
  )
}

export function ActivitiesPage() {
  const { t } = useTranslation()
  const { data, isPending } = useSync()
  const online = useOnline()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ActivityCategory | 'ALL'>('ALL')
  const [creating, setCreating] = useState(false)
  const activities = data?.activities

  const filtered = useMemo(() => {
    const needle = normalize(query.trim())
    return (activities ?? []).filter((activity) => {
      if (category !== 'ALL' && activity.category !== category) return false
      if (!needle) return true
      return normalize([activity.name, activity.description, activity.address].filter(Boolean).join(' ')).includes(needle)
    })
  }, [activities, query, category])

  const present = useMemo(() => new Set((activities ?? []).map((activity) => activity.category)), [activities])

  return (
    <Page wide>
      <PageHeader
        title={t('activities.title')}
        subtitle={t('activities.subtitle', { count: activities?.length ?? 0 })}
        actions={
          <Button icon={Plus} onClick={() => setCreating(true)} disabled={!online}>
            {t('activities.add')}
          </Button>
        }
      />
      {isPending && !data ? (
        <div className="grid min-h-[40dvh] place-items-center">
          <Spinner />
        </div>
      ) : (activities ?? []).length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={t('activities.emptyTitle')}
          text={t('activities.emptyText')}
          action={
            <Button icon={Plus} onClick={() => setCreating(true)} disabled={!online}>
              {t('activities.add')}
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
            <label className="relative md:w-72">
              <span className="sr-only">{t('common.search')}</span>
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-ink-faint" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('common.search')} className="field pl-10" type="search" />
            </label>
            <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
              {(['ALL', ...ACTIVITY_CATEGORIES.filter((entry) => present.has(entry))] as const).map((entry) => {
                const active = category === entry
                const color = entry === 'ALL' ? 'var(--ink)' : ACTIVITY_META[entry].color
                return (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setCategory(entry)}
                    aria-pressed={active}
                    className={clsx('h-9 shrink-0 rounded-full border-[1.5px] px-3.5 text-sm font-semibold transition-colors', active ? 'border-transparent text-bg' : 'border-line text-ink-soft hover:text-ink')}
                    style={active ? { backgroundColor: color } : undefined}
                  >
                    {entry === 'ALL' ? t('activities.all') : t(`activityCategory.${entry}`)}
                  </button>
                )
              })}
            </div>
          </div>
          {filtered.length === 0 ? (
            <p className="py-16 text-center text-ink-soft">{t('activities.noMatch')}</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((activity, index) => (
                <ActivityCard key={activity.id} activity={activity} index={index} />
              ))}
            </ul>
          )}
        </>
      )}
      <ActivityFormSheet open={creating} activity={null} onClose={() => setCreating(false)} />
    </Page>
  )
}
