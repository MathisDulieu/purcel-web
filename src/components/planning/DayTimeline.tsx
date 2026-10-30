import { motion } from 'motion/react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ChevronRight, MapPin } from 'lucide-react'
import clsx from 'clsx'
import { itemMeta } from '@/lib/categories'
import { formatTime, mapsUrl } from '@/lib/format'
import type { PlanningItem } from '@/lib/types'

interface DayTimelineProps {
  items: PlanningItem[]
  onOpenEvent: (item: PlanningItem) => void
}

function TimeLabel({ item }: { item: PlanningItem }) {
  const { t } = useTranslation()
  if (!item.startTime) return <span className="text-xs font-semibold text-ink-soft">{t('planning.allDay')}</span>
  return (
    <span className="flex flex-col items-end leading-tight">
      <span className="font-display text-[1.65rem] font-extrabold tabular">{formatTime(item.startTime)}</span>
      {item.endTime ? (
        <span className="text-xs font-medium text-ink-soft tabular">
          {formatTime(item.endTime)}
          {item.endDayOffset > 0 ? ` +${item.endDayOffset}` : ''}
        </span>
      ) : null}
    </span>
  )
}

function TransportCard({ item }: { item: PlanningItem }) {
  const { t } = useTranslation()
  const transport = item.transport!
  const meta = itemMeta('TRANSPORT', item.category)
  const Icon = meta.icon
  return (
    <Link
      to={`/transports/${item.id}`}
      className="group relative flex items-stretch overflow-hidden rounded-[1.4rem] bg-[#121A33] text-white shadow-card dark:bg-[#1F2B55] transition-transform hover:-translate-y-0.5"
    >
      <span className="flex w-16 shrink-0 flex-col items-center justify-center gap-1 bg-saffron text-[#121A33]">
        <Icon className="size-6" strokeWidth={2.2} />
        <span className="text-[0.65rem] font-bold">{t(`transportType.${item.category}`)}</span>
      </span>
      <span className="relative w-0 border-l-2 border-dashed border-white/25" aria-hidden="true">
        <span className="absolute -top-2 -left-[9px] size-4 rounded-full bg-bg" />
        <span className="absolute -bottom-2 -left-[9px] size-4 rounded-full bg-bg" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3.5">
        <span className="flex flex-wrap items-baseline gap-x-2 font-display text-[1.6rem] leading-none font-extrabold">
          <span className="truncate">{transport.departureLocation}</span>
          <span className="text-saffron">→</span>
          <span className="truncate">{transport.arrivalLocation}</span>
        </span>
        <span className="truncate text-sm text-white/70">
          {[transport.company, transport.referenceNumber].filter(Boolean).join(' ')}
          {transport.seats ? `${transport.company || transport.referenceNumber ? ', ' : ''}${t('transports.seatsShort', { seats: transport.seats })}` : ''}
        </span>
      </span>
      <ChevronRight className="mr-3 size-5 self-center text-white/50 transition-transform group-hover:translate-x-1" />
    </Link>
  )
}

function EventCard({ item, onOpen }: { item: PlanningItem; onOpen: () => void }) {
  const { t } = useTranslation()
  const meta = itemMeta('EVENT', item.category)
  const Icon = meta.icon
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      className="group relative cursor-pointer rounded-[1.4rem] border-[1.5px] border-line bg-surface px-4 py-3.5 text-left transition-[border-color,transform] hover:-translate-y-0.5 hover:border-[color:var(--accent)]"
      style={{ ['--accent' as string]: meta.color }}
    >
      <span className="flex items-center gap-2 text-xs font-bold" style={{ color: meta.color }}>
        <Icon className="size-3.5" strokeWidth={2.6} />
        {t(`eventCategory.${item.category}`)}
      </span>
      <span className="mt-1 block text-lg leading-snug font-bold">{item.title}</span>
      {item.activity && item.activity.name !== item.title ? <span className="block text-sm text-ink-soft">{item.activity.name}</span> : null}
      {item.description ? <span className="mt-1 line-clamp-2 block text-sm text-ink-soft">{item.description}</span> : null}
      {item.address ? (
        <a
          href={mapsUrl(item.address)}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink hover:bg-surface-3"
        >
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{item.address}</span>
        </a>
      ) : null}
    </div>
  )
}

export function DayTimeline({ items, onOpenEvent }: DayTimelineProps) {
  return (
    <ol className="relative">
      {items.map((item, index) => {
        const meta = itemMeta(item.kind, item.category)
        const transport = item.kind === 'TRANSPORT'
        const last = index === items.length - 1
        return (
          <motion.li
            key={item.id}
            className="grid grid-cols-[3.9rem_2.25rem_minmax(0,1fr)] gap-x-1 sm:grid-cols-[4.75rem_3rem_minmax(0,1fr)]"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + index * 0.08, type: 'spring', stiffness: 300, damping: 28 }}
          >
            <div className="pt-2.5 text-right">
              <TimeLabel item={item} />
            </div>
            <div className="relative flex justify-center">
              <motion.span
                className={clsx('absolute top-0 w-[6px] origin-top', last ? 'h-6' : 'bottom-0', transport ? 'rounded-none' : '')}
                style={{ backgroundColor: meta.color }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.1 + index * 0.08, duration: 0.45, ease: [0.65, 0, 0.35, 1] }}
                aria-hidden="true"
              />
              <motion.span
                className={clsx('relative z-10 mt-4 rounded-full border-[4px] border-ink bg-surface', transport ? 'size-6 bg-saffron' : 'size-5')}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.25 + index * 0.08, type: 'spring', stiffness: 520, damping: 18 }}
                aria-hidden="true"
              />
            </div>
            <div className={clsx('min-w-0', last ? 'pb-2' : 'pb-4')}>
              {transport ? <TransportCard item={item} /> : <EventCard item={item} onOpen={() => onOpenEvent(item)} />}
            </div>
          </motion.li>
        )
      })}
    </ol>
  )
}
