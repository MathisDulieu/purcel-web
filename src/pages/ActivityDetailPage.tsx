import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Clock, ExternalLink, Globe, MapPin, Pencil, Trash2, Wallet } from 'lucide-react'
import { api, fileUrl } from '@/lib/api'
import { ACTIVITY_META } from '@/lib/categories'
import { useDataMutation, useSync, useUserMap } from '@/lib/data'
import { diffFields } from '@/lib/diff'
import { capitalize, formatDate, formatDuration, formatPrice, formatTime, mapsUrl, normalizeUrl, relativeTime, websiteHost } from '@/lib/format'
import { useOnline } from '@/lib/online'
import { Page } from '@/components/AppShell'
import { BackLink } from '@/components/BackLink'
import { Button, EmptyState, Spinner } from '@/components/ui'
import { Lightbox } from '@/components/Lightbox'
import { ConfirmChanges } from '@/components/ConfirmChanges'
import { ActivityFormSheet, activityDraft, useActivitySpecs } from '@/components/activities/ActivityForm'
import { PigAvatar } from '@/components/PigAvatar'
import { useToast } from '@/components/Toast'

export function ActivityDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const online = useOnline()
  const { data, isPending } = useSync()
  const users = useUserMap()
  const specs = useActivitySpecs()
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const activity = data?.activities.find((entry) => entry.id === id)
  const scheduled = useMemo(() => (data?.events ?? []).filter((event) => event.activityId === id), [data, id])
  const remove = useDataMutation(() => api(`/api/activities/${activity!.id}?version=${activity!.version}`, { method: 'DELETE' }))

  if (isPending && !data) {
    return (
      <div className="grid min-h-[60dvh] place-items-center">
        <Spinner />
      </div>
    )
  }

  if (!activity) {
    return (
      <Page>
        <BackLink to="/activities" label={t('activities.title')} />
        <EmptyState icon={MapPin} title={t('activity.notFound')} />
      </Page>
    )
  }

  const meta = ACTIVITY_META[activity.category]
  const author = activity.updatedBy ? users.get(activity.updatedBy) : undefined
  const photos = activity.photoIds.map((photo) => fileUrl(photo))

  const facts = [
    activity.durationMinutes ? { icon: Clock, label: t('activity.duration'), value: formatDuration(activity.durationMinutes) } : null,
    activity.price !== null ? { icon: Wallet, label: t('activity.price'), value: formatPrice(activity.price, activity.currency) } : null,
    activity.openingHours ? { icon: CalendarDays, label: t('activity.openingHours'), value: activity.openingHours } : null,
  ].filter((fact): fact is NonNullable<typeof fact> => fact !== null)

  return (
    <Page wide>
      <BackLink to="/activities" label={t('activities.title')} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div>
          {photos.length > 0 ? (
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => setLightbox(0)} className="block overflow-hidden rounded-[1.75rem]" aria-label={t('activity.openPhoto')}>
                <motion.img layoutId={`activity-cover-${activity.id}`} src={photos[0]} alt="" className="aspect-[4/3] w-full object-cover" />
              </button>
              {photos.length > 1 ? (
                <div className="grid grid-cols-4 gap-2">
                  {photos.slice(1, 9).map((photo, index) => (
                    <button key={photo} type="button" onClick={() => setLightbox(index + 1)} className="overflow-hidden rounded-2xl" aria-label={t('activity.openPhoto')}>
                      <img src={photo} alt="" loading="lazy" className="aspect-square w-full object-cover transition-transform duration-300 hover:scale-105" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid aspect-[4/3] place-items-center rounded-[1.75rem]" style={{ backgroundColor: `color-mix(in oklab, ${meta.color} 20%, var(--surface))` }}>
              <meta.icon className="size-20 opacity-70" style={{ color: meta.color }} strokeWidth={1.4} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold text-white" style={{ backgroundColor: meta.color }}>
              <meta.icon className="size-4" />
              {t(`activityCategory.${activity.category}`)}
            </span>
            <h1 className="mt-3 font-display text-5xl leading-[0.9] font-black tracking-tight sm:text-6xl">{activity.name}</h1>
          </div>

          {facts.length > 0 ? (
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {facts.map((fact) => (
                <div key={fact.label} className="rounded-2xl bg-surface p-3.5 shadow-card">
                  <dt className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                    <fact.icon className="size-3.5" />
                    {fact.label}
                  </dt>
                  <dd className="mt-1 font-bold">{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="flex flex-col gap-2">
            {activity.address ? (
              <a href={mapsUrl(activity.address)} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 hover:bg-surface-2">
                <MapPin className="size-5 shrink-0 text-poppy" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold break-words">{activity.address}</span>
                  <span className="text-sm text-ink-soft">{t('common.openMaps')}</span>
                </span>
                <ExternalLink className="size-4 text-ink-faint" />
              </a>
            ) : null}
            {activity.website ? (
              <a href={normalizeUrl(activity.website)} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 hover:bg-surface-2">
                <Globe className="size-5 shrink-0 text-cobalt" />
                <span className="min-w-0 flex-1 truncate font-semibold">{websiteHost(activity.website)}</span>
                <ExternalLink className="size-4 text-ink-faint" />
              </a>
            ) : null}
          </div>

          {activity.description ? <p className="max-w-prose text-[1.05rem] leading-relaxed whitespace-pre-line">{activity.description}</p> : null}

          {activity.notes ? (
            <div className="rounded-2xl bg-saffron-soft px-4 py-3">
              <p className="text-sm font-bold">{t('activity.notes')}</p>
              <p className="mt-0.5 whitespace-pre-line">{activity.notes}</p>
            </div>
          ) : null}

          <div>
            <h2 className="font-display text-2xl font-extrabold">{t('activity.scheduled')}</h2>
            {scheduled.length === 0 ? (
              <p className="mt-1 text-sm text-ink-soft">{t('activity.notScheduled')}</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {scheduled.map((event) => (
                  <li key={event.id}>
                    <Link to={`/?day=${event.date}`} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-card hover:bg-surface-2">
                      <CalendarDays className="size-5 text-cobalt" />
                      <span className="font-semibold">{capitalize(formatDate(event.date, 'EEEE d MMMM'))}</span>
                      <span className="ml-auto text-sm text-ink-soft tabular">{event.startTime ? formatTime(event.startTime) : t('planning.allDay')}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-5">
            {author ? (
              <p className="flex w-full items-center gap-2 text-sm text-ink-soft">
                <PigAvatar avatar={author.avatar} size={22} />
                {t('common.updatedBy', { name: author.firstName, when: relativeTime(activity.updatedAt) })}
              </p>
            ) : null}
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" icon={Trash2} className="text-poppy" onClick={() => setDeleting(true)} disabled={!online}>
                {t('common.delete')}
              </Button>
              <Button icon={Pencil} onClick={() => setEditing(true)} disabled={!online}>
                {t('common.edit')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Lightbox images={photos} index={lightbox} onIndex={setLightbox} downloadUrl={(index) => `${photos[index]}&download=true`} />
      <ActivityFormSheet open={editing} activity={activity} onClose={() => setEditing(false)} />
      <ConfirmChanges
        open={deleting}
        onClose={() => setDeleting(false)}
        mode="delete"
        subject={activity.name}
        lines={diffFields(specs, activityDraft(activity), null)}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(undefined)
            toast.success(t('activity.deleted'))
            setDeleting(false)
            navigate('/activities', { replace: true })
          } catch (error) {
            setDeleting(false)
            toast.error(error)
          }
        }}
      />
    </Page>
  )
}
