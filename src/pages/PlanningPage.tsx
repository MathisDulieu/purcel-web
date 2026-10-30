import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, FileSpreadsheet, LayoutGrid, Plus, Rows3 } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import { exportUrl } from '@/lib/api'
import { usePlanningDays, useSync } from '@/lib/data'
import { capitalize, formatDate } from '@/lib/format'
import { useOnline } from '@/lib/online'
import type { PlanningEvent, PlanningItem } from '@/lib/types'
import { Page } from '@/components/AppShell'
import { Button, buttonClass, EmptyState, Spinner } from '@/components/ui'
import { DayStrip } from '@/components/planning/DayStrip'
import { DayTimeline } from '@/components/planning/DayTimeline'
import { Overview } from '@/components/planning/Overview'
import { EventDetailSheet, EventFormSheet } from '@/components/planning/EventSheets'

type View = 'day' | 'overview'

export function PlanningPage() {
  const { t, i18n } = useTranslation()
  const { data, isPending } = useSync()
  const days = usePlanningDays()
  const online = useOnline()
  const [params, setParams] = useSearchParams()
  const [today] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const view: View = params.get('view') === 'overview' ? 'overview' : 'day'
  const fallbackDay = days.find((day) => day.date === today)?.date ?? days.find((day) => day.withinTrip)?.date ?? days[0]?.date ?? today
  const selectedDate = days.some((day) => day.date === params.get('day')) ? params.get('day')! : fallbackDay
  const selected = days.find((day) => day.date === selectedDate)

  const [detail, setDetail] = useState<PlanningEvent | null>(null)
  const [form, setForm] = useState<{ open: boolean; event: PlanningEvent | null }>({ open: false, event: null })

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    next.set(key, value)
    setParams(next, { replace: true })
  }

  const openEvent = (item: PlanningItem) => {
    if (item.event) setDetail(item.event)
  }

  const liveDetail = useMemo(() => (detail ? data?.events.find((event) => event.id === detail.id) ?? null : null), [detail, data])

  if (isPending && !data) {
    return (
      <div className="grid min-h-[60dvh] place-items-center">
        <Spinner />
      </div>
    )
  }

  const trip = data?.trip

  return (
    <Page wide>
      <header className="mb-6 flex flex-col gap-5 lg:mb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-ink-soft">
              {trip ? `${capitalize(formatDate(trip.startDate, 'd MMMM'))} – ${formatDate(trip.endDate, 'd MMMM yyyy')}` : ''}
            </p>
            <h1 className="font-display text-[3.2rem] leading-[0.85] font-black tracking-tight sm:text-7xl">{trip?.destination ?? t('nav.planning')}</h1>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative mr-auto flex rounded-full bg-surface-2 p-1" role="tablist" aria-label={t('planning.view')}>
              {(['day', 'overview'] as View[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={view === option}
                  onClick={() => setParam('view', option)}
                  className={clsx('relative flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-semibold', view === option ? 'text-ink' : 'text-ink-soft')}
                >
                  {view === option ? <motion.span layoutId="planning-view" className="absolute inset-0 rounded-full bg-surface shadow-card" transition={{ type: 'spring', stiffness: 500, damping: 36 }} /> : null}
                  {option === 'day' ? <Rows3 className="relative size-4" /> : <LayoutGrid className="relative size-4" />}
                  <span className="relative">{t(`planning.${option}`)}</span>
                </button>
              ))}
            </div>
            <a
              href={exportUrl(i18n.resolvedLanguage ?? 'en')}
              download
              aria-disabled={!online}
              aria-label={t('planning.export')}
              className={buttonClass('secondary', 'md', clsx('max-md:w-11 max-md:px-0', !online && 'pointer-events-none opacity-50'))}
            >
              <FileSpreadsheet className="size-[1.15em]" strokeWidth={2.2} />
              <span className="hidden md:inline">{t('planning.export')}</span>
            </a>
            <Button icon={Plus} onClick={() => setForm({ open: true, event: null })} disabled={!online} aria-label={t('planning.add')} className="max-md:w-11 max-md:px-0">
              <span className="hidden md:inline">{t('planning.add')}</span>
            </Button>
          </div>
        </div>
        {view === 'day' ? <DayStrip days={days} selected={selectedDate} today={today} onSelect={(date) => setParam('day', date)} /> : null}
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {view === 'day' ? (
          <motion.section key={`day-${selectedDate}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {selected ? (
              <>
                <div className="mb-6 flex items-end gap-4">
                  <span className="font-display text-[5.5rem] leading-[0.75] font-black text-cobalt tabular sm:text-[7.5rem]">
                    {selected.withinTrip ? String(selected.dayNumber).padStart(2, '0') : formatDate(selected.date, 'dd')}
                  </span>
                  <div className="pb-1">
                    <p className="text-sm font-semibold text-ink-soft">
                      {selected.withinTrip ? t('planning.dayOf', { number: selected.dayNumber, total: days.filter((day) => day.withinTrip).length }) : t('planning.outside')}
                    </p>
                    <p className="font-display text-3xl leading-none font-extrabold sm:text-4xl">{capitalize(formatDate(selected.date, 'EEEE d MMMM'))}</p>
                  </div>
                </div>
                {selected.items.length === 0 ? (
                  <EmptyState
                    icon={CalendarDays}
                    title={t('planning.emptyTitle')}
                    text={t('planning.emptyText')}
                    action={
                      <Button icon={Plus} onClick={() => setForm({ open: true, event: null })} disabled={!online}>
                        {t('planning.add')}
                      </Button>
                    }
                  />
                ) : (
                  <div className="max-w-3xl">
                    <DayTimeline items={selected.items} onOpenEvent={openEvent} />
                  </div>
                )}
              </>
            ) : null}
          </motion.section>
        ) : (
          <motion.section key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <Overview
              days={days}
              today={today}
              onOpenEvent={openEvent}
              onOpenDay={(date) => {
                const next = new URLSearchParams(params)
                next.set('view', 'day')
                next.set('day', date)
                setParams(next, { replace: true })
              }}
            />
          </motion.section>
        )}
      </AnimatePresence>

      <EventDetailSheet
        event={liveDetail}
        onClose={() => setDetail(null)}
        onEdit={(event) => {
          setDetail(null)
          setForm({ open: true, event })
        }}
      />
      <EventFormSheet open={form.open} event={form.event} defaultDate={selectedDate} onClose={() => setForm({ open: false, event: null })} />
    </Page>
  )
}
