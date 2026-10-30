import { useMemo, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ChevronDown, History as HistoryIcon, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import { isSameDay, parseISO } from 'date-fns'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useDataMutation, useSync, useUserMap } from '@/lib/data'
import type { ChangeLine } from '@/lib/diff'
import { capitalize, formatDate, formatMoment } from '@/lib/format'
import { useOnline } from '@/lib/online'
import type { ChangeLogEntry, EntityType, FieldChange } from '@/lib/types'
import { Page, PageHeader } from '@/components/AppShell'
import { Button, EmptyState, Spinner } from '@/components/ui'
import { ConfirmChanges } from '@/components/ConfirmChanges'
import { PigAvatar } from '@/components/PigAvatar'
import { useToast } from '@/components/Toast'

const ENTITY_TYPES: EntityType[] = ['PLANNING_EVENT', 'ACTIVITY', 'TRANSPORT', 'DOCUMENT', 'FOLDER', 'TRIP']

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'bg-pine-soft text-pine',
  UPDATE: 'bg-saffron-soft text-[color-mix(in_oklab,var(--saffron)_55%,var(--ink))]',
  DELETE: 'bg-poppy-soft text-poppy',
  REVERT: 'bg-cobalt-soft text-cobalt',
}

function useValueFormatter() {
  const { t, i18n } = useTranslation()
  const { data } = useSync()
  return (entity: EntityType, field: string, value: string | null) => {
    if (value === null || value === '') return ''
    if (field === 'category') {
      const key = entity === 'ACTIVITY' ? `activityCategory.${value}` : `eventCategory.${value}`
      return i18n.exists(key) ? t(key) : value
    }
    if (field === 'type') return i18n.exists(`transportType.${value}`) ? t(`transportType.${value}`) : value
    if (field === 'activityId') return data?.activities.find((activity) => activity.id === value)?.name ?? value
    if (field === 'folderId' || field === 'parentId') return data?.documents.folders.find((folder) => folder.id === value)?.name ?? value
    if (field === 'photoIds') return t('activity.photoCount', { count: Number(value) })
    if (field === 'documentIds') return t('history.documentCount', { count: Number(value) })
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return capitalize(formatDate(value, 'EEE d MMM yyyy'))
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return `${capitalize(formatDate(value.slice(0, 10), 'EEE d MMM'))} ${value.slice(11, 16)}`
    return value
  }
}

function fieldLabel(t: (key: string) => string, exists: (key: string) => boolean, field: string) {
  return exists(`fields.${field}`) ? t(`fields.${field}`) : field
}

function ChangeList({ entry }: { entry: ChangeLogEntry }) {
  const { t, i18n } = useTranslation()
  const format = useValueFormatter()
  return (
    <ul className="mt-3 flex flex-col gap-1.5">
      {entry.changes.map((change: FieldChange) => {
        const before = format(entry.entityType, change.field, change.before)
        const after = format(entry.entityType, change.field, change.after)
        return (
          <li key={change.field} className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
            <span className="font-semibold">{fieldLabel(t, (key) => i18n.exists(key), change.field)}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 [overflow-wrap:anywhere]">
              {before ? <span className="text-ink-soft line-through decoration-poppy/60">{before}</span> : null}
              {before && after ? <ArrowRight className="size-3.5 shrink-0 text-ink-faint" /> : null}
              {after ? <span className="font-medium">{after}</span> : null}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function HistoryPage() {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const online = useOnline()
  const { token } = useAuth()
  const users = useUserMap()
  const format = useValueFormatter()
  const [filter, setFilter] = useState<EntityType | 'ALL'>('ALL')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [reverting, setReverting] = useState<ChangeLogEntry | null>(null)

  const query = useInfiniteQuery({
    queryKey: ['history', filter],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '40' })
      if (filter !== 'ALL') params.set('entityType', filter)
      if (pageParam) params.set('before', pageParam)
      return api<ChangeLogEntry[]>(`/api/history?${params.toString()}`)
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.length === 40 ? last[last.length - 1].id : undefined),
    enabled: token !== null,
  })

  const entries = useMemo(() => query.data?.pages.flat() ?? [], [query.data])
  const revert = useDataMutation((entry: ChangeLogEntry) => api<ChangeLogEntry>(`/api/history/${entry.id}/revert`, { method: 'POST' }))

  const revertLines = (entry: ChangeLogEntry): ChangeLine[] => {
    if (entry.action === 'CREATE') return [{ label: t(`entity.${entry.entityType}`), kind: 'removed', before: entry.entityLabel ?? '', after: '' }]
    if (entry.action === 'DELETE') return [{ label: t(`entity.${entry.entityType}`), kind: 'added', before: '', after: entry.entityLabel ?? '' }]
    return entry.changes.map((change) => {
      const label = fieldLabel(t, (key) => i18n.exists(key), change.field)
      const current = format(entry.entityType, change.field, change.after)
      const restored = format(entry.entityType, change.field, change.before)
      if (!current) return { label, kind: 'added' as const, before: '', after: restored }
      if (!restored) return { label, kind: 'removed' as const, before: current, after: '' }
      return { label, kind: 'changed' as const, before: current, after: restored }
    })
  }

  return (
    <Page>
      <PageHeader title={t('history.title')} subtitle={t('history.subtitle')} />
      <div className="scrollbar-none -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {(['ALL', ...ENTITY_TYPES] as const).map((entry) => (
          <button
            key={entry}
            type="button"
            aria-pressed={filter === entry}
            onClick={() => setFilter(entry)}
            className={clsx('h-9 shrink-0 rounded-full border-[1.5px] px-3.5 text-sm font-semibold', filter === entry ? 'border-transparent bg-ink text-bg' : 'border-line text-ink-soft hover:text-ink')}
          >
            {entry === 'ALL' ? t('history.all') : t(`entity.${entry}`)}
          </button>
        ))}
      </div>

      {query.isPending ? (
        <div className="grid min-h-[40dvh] place-items-center">
          <Spinner />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState icon={HistoryIcon} title={t('history.emptyTitle')} text={t('history.emptyText')} />
      ) : (
        <ol className="relative flex flex-col">
          {entries.map((entry, index) => {
            const previous = entries[index - 1]
            const newDay = !previous || !isSameDay(parseISO(previous.at), parseISO(entry.at))
            const author = users.get(entry.userId)
            const open = expanded.has(entry.id)
            return (
              <li key={entry.id}>
                {newDay ? <h2 className="mt-6 mb-3 font-display text-2xl font-extrabold first:mt-0">{capitalize(formatDate(entry.at, 'EEEE d MMMM'))}</h2> : null}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.02, 0.3) }}
                  className={clsx('mb-2 rounded-[1.4rem] bg-surface p-4 shadow-card', entry.revertedAt && 'opacity-60')}
                >
                  <div className="flex items-start gap-3">
                    <PigAvatar avatar={author?.avatar ?? 1} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="leading-snug">
                        <span className="font-bold">{author?.firstName ?? t('history.someone')}</span>{' '}
                        {t(`history.action.${entry.action}`)}{' '}
                        <span className="font-semibold">{entry.entityLabel}</span>
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                        <span className={clsx('rounded-full px-2 py-0.5 font-bold', ACTION_STYLES[entry.action])}>{t(`history.badge.${entry.action}`)}</span>
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 font-semibold">{t(`entity.${entry.entityType}`)}</span>
                        <span className="tabular">{formatMoment(entry.at)}</span>
                        {entry.revertedAt ? <span>{t('history.reverted', { name: users.get(entry.revertedBy ?? '')?.firstName ?? '?' })}</span> : null}
                      </p>
                    </div>
                    {entry.revertible ? (
                      <Button variant="quiet" size="sm" icon={RotateCcw} onClick={() => setReverting(entry)} disabled={!online}>
                        <span className="hidden sm:inline">{t('history.revert')}</span>
                      </Button>
                    ) : null}
                  </div>
                  {entry.changes.length > 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((current) => {
                            const next = new Set(current)
                            if (next.has(entry.id)) next.delete(entry.id)
                            else next.add(entry.id)
                            return next
                          })
                        }
                        className="mt-2 ml-[3.1rem] inline-flex items-center gap-1 text-sm font-semibold text-cobalt"
                        aria-expanded={open}
                      >
                        {t('history.details', { count: entry.changes.length })}
                        <ChevronDown className={clsx('size-4 transition-transform', open && 'rotate-180')} />
                      </button>
                      {open ? (
                        <div className="ml-[3.1rem]">
                          <ChangeList entry={entry} />
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </motion.div>
              </li>
            )
          })}
        </ol>
      )}
      {query.hasNextPage ? (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
            {t('history.more')}
          </Button>
        </div>
      ) : null}

      <ConfirmChanges
        open={reverting !== null}
        onClose={() => setReverting(null)}
        mode="update"
        subject={reverting ? `${t('history.revertOf')} ${reverting.entityLabel ?? ''}` : ''}
        lines={reverting ? revertLines(reverting) : []}
        onConfirm={async () => {
          if (!reverting) return
          try {
            await revert.mutateAsync(reverting)
            toast.success(t('history.revertDone'))
            setReverting(null)
          } catch (error) {
            setReverting(null)
            toast.error(error)
          }
        }}
      />
    </Page>
  )
}
