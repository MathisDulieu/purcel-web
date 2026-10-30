import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Plus, Route } from 'lucide-react'
import { TRANSPORT_META } from '@/lib/categories'
import { useSync } from '@/lib/data'
import { capitalize, dateOf, formatDate, timeOf } from '@/lib/format'
import { useOnline } from '@/lib/online'
import type { Transport } from '@/lib/types'
import { Page, PageHeader } from '@/components/AppShell'
import { Button, EmptyState, Spinner } from '@/components/ui'
import { TransportFormSheet } from '@/components/transports/TransportForm'

export function TransportsPage() {
  const { t } = useTranslation()
  const { data, isPending } = useSync()
  const online = useOnline()
  const [creating, setCreating] = useState(false)

  const groups = useMemo(() => {
    const map = new Map<string, Transport[]>()
    for (const transport of data?.transports ?? []) {
      const day = dateOf(transport.departureAt)
      map.set(day, [...(map.get(day) ?? []), transport])
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [data])

  return (
    <Page>
      <PageHeader
        title={t('transports.title')}
        subtitle={t('transports.subtitle', { count: data?.transports.length ?? 0 })}
        actions={
          <Button icon={Plus} onClick={() => setCreating(true)} disabled={!online}>
            {t('transports.add')}
          </Button>
        }
      />
      {isPending && !data ? (
        <div className="grid min-h-[40dvh] place-items-center">
          <Spinner />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Route}
          title={t('transports.emptyTitle')}
          text={t('transports.emptyText')}
          action={
            <Button icon={Plus} onClick={() => setCreating(true)} disabled={!online}>
              {t('transports.add')}
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(([day, transports], groupIndex) => (
            <section key={day}>
              <h2 className="mb-3 font-display text-2xl font-extrabold">{capitalize(formatDate(day, 'EEEE d MMMM'))}</h2>
              <ul className="flex flex-col gap-3">
                {transports.map((transport, index) => {
                  const Icon = TRANSPORT_META[transport.type].icon
                  return (
                    <motion.li
                      key={transport.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(groupIndex * 0.08 + index * 0.05, 0.6), type: 'spring', stiffness: 280, damping: 26 }}
                    >
                      <Link
                        to={`/transports/${transport.id}`}
                        className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-[1.5rem] bg-surface p-4 shadow-card transition-transform hover:-translate-y-0.5"
                      >
                        <span className="grid size-12 place-items-center rounded-2xl bg-saffron text-[#121A33]">
                          <Icon className="size-6" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-3">
                            <span className="font-display text-3xl leading-none font-extrabold tabular">{timeOf(transport.departureAt)}</span>
                            <span className="h-[3px] min-w-6 flex-1 rounded-full bg-surface-3" />
                            <span className="font-display text-3xl leading-none font-extrabold text-ink-soft tabular">{timeOf(transport.arrivalAt) || '?'}</span>
                          </span>
                          <span className="mt-1 block truncate font-semibold">
                            {transport.departureLocation} → {transport.arrivalLocation}
                          </span>
                          <span className="block truncate text-sm text-ink-soft">
                            {t(`transportType.${transport.type}`)}
                            {transport.company ? `, ${transport.company}` : ''}
                            {transport.referenceNumber ? ` ${transport.referenceNumber}` : ''}
                          </span>
                        </span>
                        <ChevronRight className="size-5 text-ink-faint transition-transform group-hover:translate-x-1" />
                      </Link>
                    </motion.li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      <TransportFormSheet open={creating} transport={null} defaultDate={data?.trip.startDate} onClose={() => setCreating(false)} />
    </Page>
  )
}
