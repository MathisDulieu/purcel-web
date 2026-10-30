import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Check, Copy, ExternalLink, FileText, MapPin, Pencil, Route, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { TRANSPORT_META } from '@/lib/categories'
import { useDataMutation, useSync, useUserMap } from '@/lib/data'
import { diffFields } from '@/lib/diff'
import { capitalize, dateOf, daysBetween, formatDate, formatPrice, mapsUrl, relativeTime, timeOf } from '@/lib/format'
import { useOnline } from '@/lib/online'
import { Page } from '@/components/AppShell'
import { BackLink } from '@/components/BackLink'
import { Button, EmptyState, Spinner } from '@/components/ui'
import { ConfirmChanges } from '@/components/ConfirmChanges'
import { TransportFormSheet, transportDraft, useTransportSpecs } from '@/components/transports/TransportForm'
import { PigAvatar } from '@/components/PigAvatar'
import { useToast } from '@/components/Toast'

function CopyValue({ value }: { value: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        })
      }}
      className="inline-flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-1.5 font-mono text-lg font-bold tracking-wider hover:bg-surface-3"
      aria-label={t('common.copy')}
    >
      {value}
      {copied ? <Check className="size-4 text-pine" /> : <Copy className="size-4 text-ink-soft" />}
    </button>
  )
}

function Endpoint({ label, place, address, dateTime, align }: { label: string; place: string; address: string | null; dateTime: string | null; align: 'left' | 'right' }) {
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <p className="text-sm font-semibold text-white/60">{label}</p>
      <p className="font-display text-6xl leading-[0.85] font-black tabular sm:text-7xl">{dateTime ? timeOf(dateTime) : '--:--'}</p>
      <p className="mt-2 font-display text-2xl leading-tight font-extrabold break-words sm:text-3xl">{place}</p>
      {dateTime ? <p className="text-sm text-white/70">{capitalize(formatDate(dateOf(dateTime), 'EEE d MMM'))}</p> : null}
      {address ? (
        <a href={mapsUrl(address)} target="_blank" rel="noreferrer" className={`mt-2 inline-flex max-w-full items-center gap-1.5 text-sm text-saffron hover:underline ${align === 'right' ? 'flex-row-reverse' : ''}`}>
          <MapPin className="size-4 shrink-0" />
          <span className="truncate">{address}</span>
        </a>
      ) : null}
    </div>
  )
}

export function TransportDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const online = useOnline()
  const { data, isPending } = useSync()
  const users = useUserMap()
  const specs = useTransportSpecs()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const transport = data?.transports.find((entry) => entry.id === id)
  const remove = useDataMutation(() => api(`/api/transports/${transport!.id}?version=${transport!.version}`, { method: 'DELETE' }))

  if (isPending && !data) {
    return (
      <div className="grid min-h-[60dvh] place-items-center">
        <Spinner />
      </div>
    )
  }
  if (!transport) {
    return (
      <Page>
        <BackLink to="/transports" label={t('transports.title')} />
        <EmptyState icon={Route} title={t('transport.notFound')} />
      </Page>
    )
  }

  const Icon = TRANSPORT_META[transport.type].icon
  const author = transport.updatedBy ? users.get(transport.updatedBy) : undefined
  const documents = (data?.documents.documents ?? []).filter((document) => transport.documentIds.includes(document.id))
  const minutes = transport.arrivalAt ? Math.round((new Date(transport.arrivalAt).getTime() - new Date(transport.departureAt).getTime()) / 60000) : null
  const dayOffset = transport.arrivalAt ? daysBetween(dateOf(transport.departureAt), dateOf(transport.arrivalAt)) : 0

  const details = [
    { label: t('transport.company'), value: transport.company },
    { label: t('transport.number'), value: transport.referenceNumber },
    { label: t('transport.seats'), value: transport.seats },
    { label: t('transport.price'), value: transport.price !== null ? formatPrice(transport.price, transport.currency) : null },
  ].filter((detail) => detail.value)

  return (
    <Page>
      <BackLink to="/transports" label={t('transports.title')} />
      <motion.article
        initial={{ opacity: 0, y: 24, rotate: -1 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        className="overflow-hidden rounded-[2rem] bg-[#121A33] text-white shadow-card dark:bg-[#1F2B55]"
      >
        <div className="flex items-center justify-between gap-3 bg-saffron px-6 py-4 text-[#121A33] sm:px-8">
          <span className="inline-flex items-center gap-2.5 font-display text-2xl font-extrabold">
            <Icon className="size-6" />
            {t(`transportType.${transport.type}`)}
          </span>
          {minutes !== null && minutes > 0 ? (
            <span className="text-sm font-bold tabular">
              {Math.floor(minutes / 60) > 0 ? `${Math.floor(minutes / 60)} h ` : ''}
              {String(minutes % 60).padStart(2, '0')} min
            </span>
          ) : null}
        </div>
        <div className="grid gap-6 px-6 py-7 sm:grid-cols-[1fr_auto_1fr] sm:items-start sm:px-8">
          <Endpoint label={t('transport.departure')} place={transport.departureLocation} address={transport.departureAddress} dateTime={transport.departureAt} align="left" />
          <div className="flex items-center justify-center sm:h-24" aria-hidden="true">
            <motion.span
              className="block h-[3px] w-24 origin-left rounded-full bg-saffron sm:w-20"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3, duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
            />
            <Icon className="mx-2 size-6 text-saffron" />
          </div>
          <Endpoint
            label={dayOffset > 0 ? `${t('transport.arrival')} +${dayOffset}` : t('transport.arrival')}
            place={transport.arrivalLocation}
            address={transport.arrivalAddress}
            dateTime={transport.arrivalAt}
            align="right"
          />
        </div>
        <div className="relative border-t-2 border-dashed border-white/20 px-6 py-6 sm:px-8">
          <span className="absolute -top-4 -left-4 size-8 rounded-full bg-bg" aria-hidden="true" />
          <span className="absolute -top-4 -right-4 size-8 rounded-full bg-bg" aria-hidden="true" />
          {details.length > 0 ? (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {details.map((detail) => (
                <div key={detail.label}>
                  <dt className="text-xs font-semibold text-white/60">{detail.label}</dt>
                  <dd className="mt-0.5 font-bold break-words">{detail.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {transport.bookingReference ? (
            <div className="mt-5 flex flex-wrap items-center gap-3 text-ink">
              <span className="text-sm font-semibold text-white/60">{t('transport.booking')}</span>
              <CopyValue value={transport.bookingReference} />
            </div>
          ) : null}
        </div>
      </motion.article>

      {transport.notes ? (
        <div className="mt-6 rounded-2xl bg-saffron-soft px-5 py-4">
          <p className="text-sm font-bold">{t('transport.notes')}</p>
          <p className="mt-1 whitespace-pre-line">{transport.notes}</p>
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="font-display text-2xl font-extrabold">{t('transport.documents')}</h2>
        {documents.length === 0 ? (
          <p className="mt-1 text-sm text-ink-soft">{t('transport.noLinkedDocuments')}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {documents.map((document) => (
              <li key={document.id}>
                <Link
                  to={`/documents?${new URLSearchParams({ ...(document.folderId ? { folder: document.folderId } : {}), open: document.id }).toString()}`}
                  className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-card hover:bg-surface-2"
                >
                  <FileText className="size-5 text-cobalt" />
                  <span className="min-w-0 flex-1 truncate font-semibold">{document.name}</span>
                  <ExternalLink className="size-4 text-ink-faint" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-line pt-5">
        <Link to={`/?day=${dateOf(transport.departureAt)}`} className="mr-auto inline-flex items-center gap-2 text-sm font-semibold text-cobalt hover:underline">
          <CalendarDays className="size-4" />
          {t('transport.seeDay')}
        </Link>
        {author ? (
          <p className="flex w-full items-center gap-2 text-sm text-ink-soft sm:w-auto">
            <PigAvatar avatar={author.avatar} size={22} />
            {t('common.updatedBy', { name: author.firstName, when: relativeTime(transport.updatedAt) })}
          </p>
        ) : null}
        <Button variant="ghost" icon={Trash2} className="text-poppy" onClick={() => setDeleting(true)} disabled={!online}>
          {t('common.delete')}
        </Button>
        <Button icon={Pencil} onClick={() => setEditing(true)} disabled={!online}>
          {t('common.edit')}
        </Button>
      </div>

      <TransportFormSheet open={editing} transport={transport} onClose={() => setEditing(false)} />
      <ConfirmChanges
        open={deleting}
        onClose={() => setDeleting(false)}
        mode="delete"
        subject={`${transport.departureLocation} → ${transport.arrivalLocation}`}
        lines={diffFields(specs, transportDraft(transport), null)}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(undefined)
            toast.success(t('transport.deleted'))
            setDeleting(false)
            navigate('/transports', { replace: true })
          } catch (error) {
            setDeleting(false)
            toast.error(error)
          }
        }}
      />
    </Page>
  )
}
