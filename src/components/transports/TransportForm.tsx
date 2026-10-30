import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, FileText } from 'lucide-react'
import clsx from 'clsx'
import { api } from '@/lib/api'
import { TRANSPORT_META } from '@/lib/categories'
import { useDataMutation, useSync } from '@/lib/data'
import { diffFields, type FieldSpec } from '@/lib/diff'
import { capitalize, formatDate, formatPrice } from '@/lib/format'
import { useOnline } from '@/lib/online'
import { TRANSPORT_TYPES, type Transport, type TransportType } from '@/lib/types'
import { Sheet } from '@/components/Sheet'
import { ConfirmChanges } from '@/components/ConfirmChanges'
import { Button, TextArea, TextInput } from '@/components/ui'
import { useToast } from '@/components/Toast'

export interface TransportDraft {
  type: TransportType
  departureLocation: string
  departureAddress: string
  departureAt: string
  arrivalLocation: string
  arrivalAddress: string
  arrivalAt: string
  company: string
  referenceNumber: string
  seats: string
  bookingReference: string
  price: string
  currency: string
  notes: string
  documentIds: string[]
}

export function transportDraft(transport: Transport | null, defaultDate?: string): TransportDraft {
  return {
    type: transport?.type ?? 'PLANE',
    departureLocation: transport?.departureLocation ?? '',
    departureAddress: transport?.departureAddress ?? '',
    departureAt: transport?.departureAt?.slice(0, 16) ?? (defaultDate ? `${defaultDate}T09:00` : ''),
    arrivalLocation: transport?.arrivalLocation ?? '',
    arrivalAddress: transport?.arrivalAddress ?? '',
    arrivalAt: transport?.arrivalAt?.slice(0, 16) ?? '',
    company: transport?.company ?? '',
    referenceNumber: transport?.referenceNumber ?? '',
    seats: transport?.seats ?? '',
    bookingReference: transport?.bookingReference ?? '',
    price: transport?.price != null ? String(transport.price) : '',
    currency: transport?.currency ?? 'EUR',
    notes: transport?.notes ?? '',
    documentIds: transport?.documentIds ?? [],
  }
}

function payload(draft: TransportDraft) {
  const price = draft.price.trim() === '' ? null : Number(draft.price.replace(',', '.'))
  return {
    type: draft.type,
    departureLocation: draft.departureLocation.trim(),
    departureAddress: draft.departureAddress.trim() || null,
    departureAt: draft.departureAt,
    arrivalLocation: draft.arrivalLocation.trim(),
    arrivalAddress: draft.arrivalAddress.trim() || null,
    arrivalAt: draft.arrivalAt || null,
    company: draft.company.trim() || null,
    referenceNumber: draft.referenceNumber.trim() || null,
    seats: draft.seats.trim() || null,
    bookingReference: draft.bookingReference.trim() || null,
    price: price !== null && Number.isFinite(price) ? price : null,
    currency: price !== null ? draft.currency.trim() || null : null,
    notes: draft.notes.trim() || null,
    documentIds: draft.documentIds,
  }
}

function dateTimeLabel(value: unknown) {
  const text = String(value)
  return `${capitalize(formatDate(text.slice(0, 10), 'EEE d MMM'))} ${text.slice(11, 16)}`
}

export function useTransportSpecs(): FieldSpec<TransportDraft>[] {
  const { t } = useTranslation()
  const { data } = useSync()
  const documents = data?.documents.documents ?? []
  return [
    { key: 'type', label: t('transport.type'), format: (value) => t(`transportType.${value}`) },
    { key: 'departureLocation', label: t('transport.from') },
    { key: 'departureAddress', label: t('transport.fromAddress') },
    { key: 'departureAt', label: t('transport.departure'), format: dateTimeLabel },
    { key: 'arrivalLocation', label: t('transport.to') },
    { key: 'arrivalAddress', label: t('transport.toAddress') },
    { key: 'arrivalAt', label: t('transport.arrival'), format: dateTimeLabel },
    { key: 'company', label: t('transport.company') },
    { key: 'referenceNumber', label: t('transport.number') },
    { key: 'seats', label: t('transport.seats') },
    { key: 'bookingReference', label: t('transport.booking') },
    { key: 'price', label: t('transport.price'), format: (value, source) => formatPrice(Number(String(value).replace(',', '.')), source.currency) },
    {
      key: 'documentIds',
      label: t('transport.documents'),
      format: (value) => (value as string[]).map((id) => documents.find((document) => document.id === id)?.name ?? '?').join(', '),
    },
    { key: 'notes', label: t('transport.notes') },
  ]
}

interface TransportFormProps {
  open: boolean
  onClose: () => void
  transport: Transport | null
  defaultDate?: string
  onSaved?: (transport: Transport) => void
}

export function TransportFormSheet({ open, onClose, transport, defaultDate, onSaved }: TransportFormProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const online = useOnline()
  const { data } = useSync()
  const specs = useTransportSpecs()
  const [draft, setDraft] = useState<TransportDraft>(() => transportDraft(transport, defaultDate))
  const [confirming, setConfirming] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const documents = data?.documents.documents ?? []

  useEffect(() => {
    if (open) {
      setDraft(transportDraft(transport, defaultDate))
      setErrors({})
    }
  }, [open, transport, defaultDate])

  const original = useMemo(() => (transport ? transportDraft(transport) : null), [transport])
  const lines = useMemo(() => diffFields(specs, original, draft), [specs, original, draft])
  const update = <K extends keyof TransportDraft>(key: K, value: TransportDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))

  const mutation = useDataMutation((body: ReturnType<typeof payload>) =>
    transport
      ? api<Transport>(`/api/transports/${transport.id}`, { method: 'PUT', json: { ...body, version: transport.version } })
      : api<Transport>('/api/transports', { method: 'POST', json: body }),
  )

  const review = () => {
    const next: Record<string, string> = {}
    if (!draft.departureLocation.trim()) next.departureLocation = t('validation.required')
    if (!draft.arrivalLocation.trim()) next.arrivalLocation = t('validation.required')
    if (!draft.departureAt) next.departureAt = t('validation.required')
    if (draft.arrivalAt && draft.departureAt && draft.arrivalAt < draft.departureAt) next.arrivalAt = t('validation.arrivalBefore')
    if (draft.price.trim() && !Number.isFinite(Number(draft.price.replace(',', '.')))) next.price = t('validation.number')
    setErrors(next)
    if (Object.keys(next).length === 0) setConfirming(true)
  }

  const save = async () => {
    try {
      const saved = await mutation.mutateAsync(payload(draft))
      toast.success(transport ? t('transport.updated') : t('transport.created'))
      setConfirming(false)
      onClose()
      onSaved?.(saved)
    } catch (error) {
      setConfirming(false)
      toast.error(error)
    }
  }

  const toggleDocument = (id: string) =>
    update('documentIds', draft.documentIds.includes(id) ? draft.documentIds.filter((entry) => entry !== id) : [...draft.documentIds, id])

  return (
    <>
      <Sheet
        open={open && !confirming}
        onClose={onClose}
        title={transport ? t('transport.editTitle') : t('transport.newTitle')}
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
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('transport.type')}>
            {TRANSPORT_TYPES.map((type) => {
              const Icon = TRANSPORT_META[type].icon
              const active = draft.type === type
              return (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => update('type', type)}
                  className={clsx(
                    'inline-flex h-11 items-center gap-2 rounded-full border-[1.5px] px-4 text-sm font-semibold transition-colors',
                    active ? 'border-transparent bg-saffron text-[#121A33]' : 'border-line hover:border-ink-faint',
                  )}
                >
                  <Icon className="size-4.5" />
                  {t(`transportType.${type}`)}
                </button>
              )
            })}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <fieldset className="flex flex-col gap-3 rounded-2xl bg-surface-2 p-4">
              <legend className="sr-only">{t('transport.departure')}</legend>
              <p className="font-display text-xl font-extrabold">{t('transport.departure')}</p>
              <TextInput label={t('transport.from')} value={draft.departureLocation} maxLength={120} error={errors.departureLocation} onChange={(e) => update('departureLocation', e.target.value)} data-autofocus />
              <TextInput label={t('transport.fromAddress')} value={draft.departureAddress} maxLength={300} onChange={(e) => update('departureAddress', e.target.value)} />
              <TextInput type="datetime-local" label={t('transport.when')} value={draft.departureAt} error={errors.departureAt} onChange={(e) => update('departureAt', e.target.value)} />
            </fieldset>
            <fieldset className="flex flex-col gap-3 rounded-2xl bg-surface-2 p-4">
              <legend className="sr-only">{t('transport.arrival')}</legend>
              <p className="font-display text-xl font-extrabold">{t('transport.arrival')}</p>
              <TextInput label={t('transport.to')} value={draft.arrivalLocation} maxLength={120} error={errors.arrivalLocation} onChange={(e) => update('arrivalLocation', e.target.value)} />
              <TextInput label={t('transport.toAddress')} value={draft.arrivalAddress} maxLength={300} onChange={(e) => update('arrivalAddress', e.target.value)} />
              <TextInput type="datetime-local" label={t('transport.when')} value={draft.arrivalAt} error={errors.arrivalAt} onChange={(e) => update('arrivalAt', e.target.value)} />
            </fieldset>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <TextInput label={t('transport.company')} value={draft.company} maxLength={80} onChange={(e) => update('company', e.target.value)} />
            <TextInput label={t('transport.number')} value={draft.referenceNumber} maxLength={40} onChange={(e) => update('referenceNumber', e.target.value)} />
            <TextInput className="col-span-2 md:col-span-1" label={t('transport.booking')} value={draft.bookingReference} maxLength={80} onChange={(e) => update('bookingReference', e.target.value)} />
            <TextInput className="col-span-2 md:col-span-1" label={t('transport.seats')} value={draft.seats} maxLength={120} onChange={(e) => update('seats', e.target.value)} />
            <TextInput label={t('transport.price')} inputMode="decimal" value={draft.price} error={errors.price} onChange={(e) => update('price', e.target.value)} />
            <TextInput label={t('activity.currency')} value={draft.currency} maxLength={8} onChange={(e) => update('currency', e.target.value.toUpperCase())} />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-semibold">{t('transport.documents')}</p>
            {documents.length === 0 ? (
              <p className="text-sm text-ink-soft">{t('transport.noDocuments')}</p>
            ) : (
              <ul className="flex max-h-52 flex-col gap-1 overflow-y-auto rounded-2xl border border-line p-1.5">
                {documents.map((document) => {
                  const checked = draft.documentIds.includes(document.id)
                  return (
                    <li key={document.id}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        onClick={() => toggleDocument(document.id)}
                        className={clsx('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm', checked ? 'bg-cobalt-soft' : 'hover:bg-surface-2')}
                      >
                        <span className={clsx('grid size-5 shrink-0 place-items-center rounded-md border-[1.5px]', checked ? 'border-cobalt bg-cobalt text-on-cobalt' : 'border-line')}>
                          {checked ? <Check className="size-3.5" strokeWidth={3} /> : null}
                        </span>
                        <FileText className="size-4 shrink-0 text-ink-soft" />
                        <span className="truncate font-medium">{document.name}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <TextArea label={t('transport.notes')} value={draft.notes} maxLength={3000} rows={3} onChange={(e) => update('notes', e.target.value)} />
        </div>
      </Sheet>
      <ConfirmChanges
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={save}
        mode={transport ? 'update' : 'create'}
        subject={`${draft.departureLocation} → ${draft.arrivalLocation}`}
        lines={lines}
      />
    </>
  )
}
