import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { api } from '@/lib/api'
import { ACTIVITY_META } from '@/lib/categories'
import { useDataMutation } from '@/lib/data'
import { diffFields, type FieldSpec } from '@/lib/diff'
import { formatDuration, formatPrice } from '@/lib/format'
import { useOnline } from '@/lib/online'
import { ACTIVITY_CATEGORIES, type Activity, type ActivityCategory } from '@/lib/types'
import { Sheet } from '@/components/Sheet'
import { ConfirmChanges } from '@/components/ConfirmChanges'
import { Button, TextArea, TextInput } from '@/components/ui'
import { PhotoField } from '@/components/PhotoField'
import { useToast } from '@/components/Toast'

export interface ActivityDraft {
  name: string
  category: ActivityCategory
  description: string
  address: string
  photoIds: string[]
  price: string
  currency: string
  durationMinutes: string
  website: string
  openingHours: string
  notes: string
}

export function activityDraft(activity: Activity | null): ActivityDraft {
  return {
    name: activity?.name ?? '',
    category: activity?.category ?? 'SIGHTSEEING',
    description: activity?.description ?? '',
    address: activity?.address ?? '',
    photoIds: activity?.photoIds ?? [],
    price: activity?.price != null ? String(activity.price) : '',
    currency: activity?.currency ?? 'RON',
    durationMinutes: activity?.durationMinutes != null ? String(activity.durationMinutes) : '',
    website: activity?.website ?? '',
    openingHours: activity?.openingHours ?? '',
    notes: activity?.notes ?? '',
  }
}

function payload(draft: ActivityDraft) {
  const price = draft.price.trim() === '' ? null : Number(draft.price.replace(',', '.'))
  const duration = draft.durationMinutes.trim() === '' ? null : Number.parseInt(draft.durationMinutes, 10)
  return {
    name: draft.name.trim(),
    category: draft.category,
    description: draft.description.trim() || null,
    address: draft.address.trim() || null,
    photoIds: draft.photoIds,
    price: price !== null && Number.isFinite(price) ? price : null,
    currency: price !== null ? draft.currency.trim() || null : null,
    durationMinutes: duration !== null && Number.isFinite(duration) ? duration : null,
    website: draft.website.trim() || null,
    openingHours: draft.openingHours.trim() || null,
    notes: draft.notes.trim() || null,
  }
}

export function useActivitySpecs(): FieldSpec<ActivityDraft>[] {
  const { t } = useTranslation()
  return [
    { key: 'name', label: t('activity.name') },
    { key: 'category', label: t('activity.category'), format: (value) => t(`activityCategory.${value}`) },
    { key: 'photoIds', label: t('activity.photos'), format: (value) => t('activity.photoCount', { count: (value as string[]).length }) },
    { key: 'address', label: t('activity.address') },
    { key: 'durationMinutes', label: t('activity.duration'), format: (value) => formatDuration(Number(value)) },
    { key: 'price', label: t('activity.price'), format: (value, source) => formatPrice(Number(String(value).replace(',', '.')), source.currency) },
    { key: 'openingHours', label: t('activity.openingHours') },
    { key: 'website', label: t('activity.website') },
    { key: 'description', label: t('activity.description') },
    { key: 'notes', label: t('activity.notes') },
  ]
}

interface ActivityFormProps {
  open: boolean
  onClose: () => void
  activity: Activity | null
  onSaved?: (activity: Activity) => void
}

export function ActivityFormSheet({ open, onClose, activity, onSaved }: ActivityFormProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const online = useOnline()
  const specs = useActivitySpecs()
  const [draft, setDraft] = useState<ActivityDraft>(() => activityDraft(activity))
  const [confirming, setConfirming] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setDraft(activityDraft(activity))
      setErrors({})
    }
  }, [open, activity])

  const original = useMemo(() => (activity ? activityDraft(activity) : null), [activity])
  const lines = useMemo(() => diffFields(specs, original, draft), [specs, original, draft])
  const update = <K extends keyof ActivityDraft>(key: K, value: ActivityDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))

  const mutation = useDataMutation((body: ReturnType<typeof payload>) =>
    activity
      ? api<Activity>(`/api/activities/${activity.id}`, { method: 'PUT', json: { ...body, version: activity.version } })
      : api<Activity>('/api/activities', { method: 'POST', json: body }),
  )

  const review = () => {
    const next: Record<string, string> = {}
    if (!draft.name.trim()) next.name = t('validation.required')
    if (draft.price.trim() && !Number.isFinite(Number(draft.price.replace(',', '.')))) next.price = t('validation.number')
    if (draft.durationMinutes.trim() && !/^\d+$/.test(draft.durationMinutes.trim())) next.durationMinutes = t('validation.number')
    setErrors(next)
    if (Object.keys(next).length === 0) setConfirming(true)
  }

  const save = async () => {
    try {
      const saved = await mutation.mutateAsync(payload(draft))
      toast.success(activity ? t('activity.updated') : t('activity.created'))
      setConfirming(false)
      onClose()
      onSaved?.(saved)
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
        title={activity ? t('activity.editTitle') : t('activity.newTitle')}
        size="lg"
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
          <TextInput label={t('activity.name')} value={draft.name} maxLength={120} error={errors.name} onChange={(e) => update('name', e.target.value)} data-autofocus />
          <div>
            <p className="mb-1.5 text-sm font-semibold">{t('activity.category')}</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('activity.category')}>
              {ACTIVITY_CATEGORIES.map((category) => {
                const meta = ACTIVITY_META[category]
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
                    {t(`activityCategory.${category}`)}
                  </button>
                )
              })}
            </div>
          </div>
          <PhotoField value={draft.photoIds} onChange={(ids) => update('photoIds', ids)} />
          <TextInput label={t('activity.address')} value={draft.address} maxLength={300} onChange={(e) => update('address', e.target.value)} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <TextInput label={t('activity.durationMinutes')} inputMode="numeric" value={draft.durationMinutes} error={errors.durationMinutes} onChange={(e) => update('durationMinutes', e.target.value)} />
            <TextInput label={t('activity.price')} inputMode="decimal" value={draft.price} error={errors.price} onChange={(e) => update('price', e.target.value)} />
            <TextInput label={t('activity.currency')} value={draft.currency} maxLength={8} onChange={(e) => update('currency', e.target.value.toUpperCase())} />
            <TextInput label={t('activity.openingHours')} value={draft.openingHours} maxLength={300} onChange={(e) => update('openingHours', e.target.value)} />
          </div>
          <TextInput label={t('activity.website')} type="url" value={draft.website} maxLength={500} placeholder="https://" onChange={(e) => update('website', e.target.value)} />
          <TextArea label={t('activity.description')} value={draft.description} maxLength={5000} rows={5} onChange={(e) => update('description', e.target.value)} />
          <TextArea label={t('activity.notes')} value={draft.notes} maxLength={2000} rows={2} onChange={(e) => update('notes', e.target.value)} />
        </div>
      </Sheet>
      <ConfirmChanges open={confirming} onClose={() => setConfirming(false)} onConfirm={save} mode={activity ? 'update' : 'create'} subject={draft.name} lines={lines} />
    </>
  )
}
