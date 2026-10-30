import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Clock, MapPin, Pencil, Sparkles, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { api } from '@/lib/api'
import { EVENT_META } from '@/lib/categories'
import { useDataMutation, useSync, useUserMap } from '@/lib/data'
import { diffFields, type FieldSpec } from '@/lib/diff'
import { capitalize, formatDate, formatTime, mapsUrl, relativeTime } from '@/lib/format'
import { useOnline } from '@/lib/online'
import { EVENT_CATEGORIES, type EventCategory, type PlanningEvent } from '@/lib/types'
import { Sheet } from '@/components/Sheet'
import { ConfirmChanges } from '@/components/ConfirmChanges'
import { Button, SelectInput, TextArea, TextInput } from '@/components/ui'
import { PigAvatar } from '@/components/PigAvatar'
import { useToast } from '@/components/Toast'

interface EventDraft {
  date: string
  startTime: string
  endTime: string
  title: string
  category: EventCategory
  description: string
  address: string
  activityId: string
}

function toDraft(event: PlanningEvent | null, date: string): EventDraft {
  return {
    date: event?.date ?? date,
    startTime: formatTime(event?.startTime),
    endTime: formatTime(event?.endTime),
    title: event?.title ?? '',
    category: event?.category ?? 'ACTIVITY',
    description: event?.description ?? '',
    address: event?.address ?? '',
    activityId: event?.activityId ?? '',
  }
}

function toPayload(draft: EventDraft) {
  return {
    date: draft.date,
    startTime: draft.startTime || null,
    endTime: draft.endTime || null,
    title: draft.title.trim(),
    category: draft.category,
    description: draft.description.trim() || null,
    address: draft.address.trim() || null,
    activityId: draft.activityId || null,
  }
}

export function useEventSpecs(): FieldSpec<EventDraft>[] {
  const { t } = useTranslation()
  const { data } = useSync()
  const activities = data?.activities ?? []
  return [
    { key: 'title', label: t('event.title') },
    { key: 'category', label: t('event.category'), format: (value) => t(`eventCategory.${value}`) },
    { key: 'date', label: t('event.date'), format: (value) => capitalize(formatDate(String(value), 'EEEE d MMMM')) },
    { key: 'startTime', label: t('event.start') },
    { key: 'endTime', label: t('event.end') },
    { key: 'activityId', label: t('event.activity'), format: (value) => activities.find((activity) => activity.id === value)?.name ?? String(value) },
    { key: 'address', label: t('event.address') },
    { key: 'description', label: t('event.description') },
  ]
}

interface EventFormProps {
  open: boolean
  onClose: () => void
  event: PlanningEvent | null
  defaultDate: string
}

export function EventFormSheet({ open, onClose, event, defaultDate }: EventFormProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const online = useOnline()
  const { data } = useSync()
  const specs = useEventSpecs()
  const [draft, setDraft] = useState<EventDraft>(() => toDraft(event, defaultDate))
  const [confirming, setConfirming] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setDraft(toDraft(event, defaultDate))
      setErrors({})
    }
  }, [open, event, defaultDate])

  const mutation = useDataMutation((payload: ReturnType<typeof toPayload>) =>
    event
      ? api<PlanningEvent>(`/api/planning/events/${event.id}`, { method: 'PUT', json: { ...payload, version: event.version } })
      : api<PlanningEvent>('/api/planning/events', { method: 'POST', json: payload }),
  )

  const original = useMemo(() => (event ? toDraft(event, defaultDate) : null), [event, defaultDate])
  const lines = useMemo(() => diffFields(specs, original, draft), [specs, original, draft])
  const activities = data?.activities ?? []
  const update = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))

  const review = () => {
    const next: Record<string, string> = {}
    if (!draft.title.trim()) next.title = t('validation.required')
    if (!draft.date) next.date = t('validation.required')
    setErrors(next)
    if (Object.keys(next).length === 0) setConfirming(true)
  }

  const save = async () => {
    try {
      await mutation.mutateAsync(toPayload(draft))
      toast.success(event ? t('event.updated') : t('event.created'))
      setConfirming(false)
      onClose()
    } catch (error) {
      setConfirming(false)
      toast.error(error)
    }
  }

  return (
    <>
      <Sheet
        open={open && !confirming}
        onClose={onClose}
        title={event ? t('event.editTitle') : t('event.newTitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={review} disabled={!online}>
              {t('common.review')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <TextInput label={t('event.title')} value={draft.title} maxLength={120} error={errors.title} onChange={(e) => update('title', e.target.value)} data-autofocus />
          <div>
            <p className="mb-1.5 text-sm font-semibold">{t('event.category')}</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('event.category')}>
              {EVENT_CATEGORIES.map((category) => {
                const meta = EVENT_META[category]
                const active = draft.category === category
                return (
                  <button
                    key={category}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => update('category', category)}
                    className={clsx(
                      'inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] px-3.5 text-sm font-semibold transition-colors',
                      active ? 'border-transparent text-white' : 'border-line hover:border-ink-faint',
                    )}
                    style={active ? { backgroundColor: meta.color } : undefined}
                  >
                    <meta.icon className="size-4" />
                    {t(`eventCategory.${category}`)}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <TextInput className="col-span-2 sm:col-span-1" type="date" label={t('event.date')} value={draft.date} error={errors.date} onChange={(e) => update('date', e.target.value)} />
            <TextInput type="time" label={t('event.start')} value={draft.startTime} onChange={(e) => update('startTime', e.target.value)} />
            <TextInput type="time" label={t('event.end')} value={draft.endTime} onChange={(e) => update('endTime', e.target.value)} />
          </div>
          <SelectInput
            label={t('event.activity')}
            hint={t('event.activityHint')}
            value={draft.activityId}
            onChange={(e) => {
              const id = e.target.value
              const activity = activities.find((entry) => entry.id === id)
              setDraft((current) => ({
                ...current,
                activityId: id,
                title: current.title || activity?.name || '',
              }))
            }}
            options={[{ value: '', label: t('event.noActivity') }, ...activities.map((activity) => ({ value: activity.id, label: activity.name }))]}
          />
          <TextInput
            label={t('event.address')}
            value={draft.address}
            maxLength={300}
            placeholder={activities.find((activity) => activity.id === draft.activityId)?.address ?? ''}
            onChange={(e) => update('address', e.target.value)}
          />
          <TextArea label={t('event.description')} value={draft.description} maxLength={4000} rows={4} onChange={(e) => update('description', e.target.value)} />
        </div>
      </Sheet>
      <ConfirmChanges
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={save}
        mode={event ? 'update' : 'create'}
        subject={draft.title}
        lines={lines}
      />
    </>
  )
}

interface EventDetailProps {
  event: PlanningEvent | null
  onClose: () => void
  onEdit: (event: PlanningEvent) => void
}

export function EventDetailSheet({ event, onClose, onEdit }: EventDetailProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const online = useOnline()
  const { data } = useSync()
  const users = useUserMap()
  const specs = useEventSpecs()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [current, setCurrent] = useState<PlanningEvent | null>(event)

  useEffect(() => {
    if (event) setCurrent(event)
  }, [event])

  const remove = useDataMutation((target: PlanningEvent) =>
    api(`/api/planning/events/${target.id}?version=${target.version}`, { method: 'DELETE' }),
  )

  const shown = current
  const activity = shown?.activityId ? data?.activities.find((entry) => entry.id === shown.activityId) : undefined
  const meta = shown ? EVENT_META[shown.category] : EVENT_META.OTHER
  const author = shown?.updatedBy ? users.get(shown.updatedBy) : undefined
  const address = shown?.address ?? activity?.address ?? null

  return (
    <>
      <Sheet
        open={event !== null && !confirmDelete}
        onClose={onClose}
        title={shown?.title ?? ''}
        description={
          shown ? (
            <span className="inline-flex items-center gap-2 font-semibold" style={{ color: meta.color }}>
              <meta.icon className="size-4" />
              {t(`eventCategory.${shown.category}`)}
            </span>
          ) : null
        }
        size="md"
        footer={
          shown ? (
            <>
              <Button variant="ghost" icon={Trash2} className="mr-auto text-poppy" onClick={() => setConfirmDelete(true)} disabled={!online}>
                {t('common.delete')}
              </Button>
              <Button icon={Pencil} onClick={() => onEdit(shown)} disabled={!online}>
                {t('common.edit')}
              </Button>
            </>
          ) : null
        }
      >
        {shown ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3">
              <Clock className="size-5 text-ink-soft" />
              <div>
                <p className="font-semibold">{capitalize(formatDate(shown.date, 'EEEE d MMMM'))}</p>
                <p className="text-sm text-ink-soft tabular">
                  {shown.startTime ? formatTime(shown.startTime) : t('planning.allDay')}
                  {shown.endTime ? ` – ${formatTime(shown.endTime)}` : ''}
                </p>
              </div>
            </div>
            {address ? (
              <a href={mapsUrl(address)} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 hover:bg-surface-2">
                <MapPin className="size-5 text-poppy" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{address}</span>
                  <span className="text-sm text-ink-soft">{t('common.openMaps')}</span>
                </span>
              </a>
            ) : null}
            {activity ? (
              <Link to={`/activities/${activity.id}`} className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 hover:bg-surface-2">
                <Sparkles className="size-5 text-cobalt" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{activity.name}</span>
                  <span className="text-sm text-ink-soft">{t('event.seeActivity')}</span>
                </span>
              </Link>
            ) : null}
            {shown.description ? <p className="whitespace-pre-line text-[0.97rem] leading-relaxed">{shown.description}</p> : null}
            {author ? (
              <p className="flex items-center gap-2 text-sm text-ink-soft">
                <PigAvatar avatar={author.avatar} size={22} />
                {t('common.updatedBy', { name: author.firstName, when: relativeTime(shown.updatedAt) })}
              </p>
            ) : null}
          </div>
        ) : null}
      </Sheet>
      {shown ? (
        <ConfirmChanges
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          mode="delete"
          subject={shown.title}
          lines={diffFields(specs, toDraft(shown, shown.date), null)}
          onConfirm={async () => {
            try {
              await remove.mutateAsync(shown)
              toast.success(t('event.deleted'))
              setConfirmDelete(false)
              onClose()
            } catch (error) {
              setConfirmDelete(false)
              toast.error(error)
            }
          }}
        />
      ) : null}
    </>
  )
}
