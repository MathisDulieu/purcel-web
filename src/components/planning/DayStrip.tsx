import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { itemMeta } from '@/lib/categories'
import { capitalize, formatDate } from '@/lib/format'
import type { PlanningDay } from '@/lib/types'

interface DayStripProps {
  days: PlanningDay[]
  selected: string
  onSelect: (date: string) => void
  today: string
}

export function DayStrip({ days, selected, onSelect, today }: DayStripProps) {
  const { t } = useTranslation()
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const target = scroller.current?.querySelector<HTMLElement>(`[data-date="${selected}"]`)
    target?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selected])

  return (
    <div ref={scroller} className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0" role="tablist" aria-label={t('planning.days')}>
      <div className="relative inline-flex w-max pb-1">
        <div className="absolute top-[2.6rem] right-8 left-8 h-[6px] rounded-full bg-surface-3" aria-hidden="true" />
        <motion.div
          className="absolute top-[2.6rem] left-8 h-[6px] origin-left rounded-full bg-cobalt"
          style={{ right: '2rem' }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
          aria-hidden="true"
        />
        {days.map((day, index) => {
          const active = day.date === selected
          const isToday = day.date === today
          return (
            <button
              key={day.date}
              type="button"
              role="tab"
              aria-selected={active}
              data-date={day.date}
              onClick={() => onSelect(day.date)}
              className="group relative flex w-16 flex-col items-center sm:w-[4.6rem]"
            >
              <span className={clsx('text-xs font-semibold transition-colors', active ? 'text-ink' : 'text-ink-soft')}>
                {capitalize(formatDate(day.date, 'EEE'))}
              </span>
              <span className="relative mt-2 grid size-9 place-items-center">
                {active ? (
                  <motion.span
                    layoutId="day-station"
                    className="absolute inset-[-7px] rounded-full border-[3px] border-saffron"
                    transition={{ type: 'spring', stiffness: 460, damping: 30 }}
                  />
                ) : null}
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15 + index * 0.07, type: 'spring', stiffness: 500, damping: 20 }}
                  className={clsx(
                    'relative size-6 rounded-full border-[4px] transition-colors group-hover:scale-110',
                    active ? 'border-ink bg-saffron' : 'border-ink bg-surface',
                    !day.withinTrip && 'border-dashed border-ink-faint',
                  )}
                />
              </span>
              <span className={clsx('mt-1.5 font-display text-2xl leading-none font-extrabold tabular', active ? 'text-ink' : 'text-ink-soft')}>
                {formatDate(day.date, 'd')}
              </span>
              <span className="mt-1.5 flex h-1.5 gap-[3px]" aria-hidden="true">
                {day.items.slice(0, 6).map((item) => (
                  <span key={item.id} className="size-1.5 rounded-full" style={{ backgroundColor: itemMeta(item.kind, item.category).color }} />
                ))}
              </span>
              {isToday ? <span className="mt-1 text-[0.65rem] font-bold text-poppy">{t('planning.today')}</span> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
