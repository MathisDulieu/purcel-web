import { motion } from 'motion/react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { itemMeta } from '@/lib/categories'
import { capitalize, formatDate, formatTime } from '@/lib/format'
import type { PlanningDay, PlanningItem } from '@/lib/types'

interface OverviewProps {
  days: PlanningDay[]
  today: string
  onOpenDay: (date: string) => void
  onOpenEvent: (item: PlanningItem) => void
}

export function Overview({ days, today, onOpenDay, onOpenEvent }: OverviewProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className="pb-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {days.map((day, dayIndex) => (
          <motion.section
            key={day.date}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: dayIndex * 0.05, type: 'spring', stiffness: 260, damping: 26 }}
            className={clsx('flex min-w-0 flex-col rounded-[1.6rem] border-[1.5px] bg-surface p-3 sm:min-h-48', day.date === today ? 'border-saffron' : 'border-line')}
          >
            <button type="button" onClick={() => onOpenDay(day.date)} className="flex items-baseline justify-between gap-2 rounded-xl px-1.5 py-1 text-left hover:bg-surface-2">
              <span>
                <span className="block font-display text-3xl leading-none font-extrabold">
                  {day.withinTrip ? t('planning.dayNumber', { number: day.dayNumber }) : capitalize(formatDate(day.date, 'EEEE'))}
                </span>
                <span className="text-sm text-ink-soft">{capitalize(formatDate(day.date, 'EEEE d MMMM'))}</span>
              </span>
              <span className="text-xs font-bold text-ink-faint tabular">{day.items.length}</span>
            </button>
            <ul className="mt-2 flex flex-1 flex-col gap-1.5">
              {day.items.length === 0 ? <li className="px-1.5 py-2 text-sm text-ink-faint">{t('planning.emptyShort')}</li> : null}
              {day.items.map((item) => {
                const meta = itemMeta(item.kind, item.category)
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => (item.kind === 'TRANSPORT' ? navigate(`/transports/${item.id}`) : onOpenEvent(item))}
                      className="flex w-full items-stretch gap-2.5 rounded-xl px-1.5 py-1.5 text-left hover:bg-surface-2"
                    >
                      <span className="w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-ink-soft tabular">
                          {item.startTime ? formatTime(item.startTime) : t('planning.allDay')}
                          {item.endTime ? ` – ${formatTime(item.endTime)}` : ''}
                        </span>
                        <span className="line-clamp-2 block text-sm font-semibold">{item.title}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </motion.section>
        ))}
      </div>
    </div>
  )
}
