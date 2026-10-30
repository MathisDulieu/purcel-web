import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { KeyRound, Mail, MailCheck, Pencil, Shuffle, Trash2, UserPlus, Users } from 'lucide-react'
import clsx from 'clsx'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { diffFields, type FieldSpec } from '@/lib/diff'
import { formatMoment, relativeTime } from '@/lib/format'
import { useOnline } from '@/lib/online'
import type { AdminUser, Language } from '@/lib/types'
import { Page, PageHeader } from '@/components/AppShell'
import { AvatarPicker } from '@/components/AvatarPicker'
import { ConfirmChanges } from '@/components/ConfirmChanges'
import { PigAvatar } from '@/components/PigAvatar'
import { Sheet } from '@/components/Sheet'
import { Button, EmptyState, IconButton, SelectInput, Spinner, TextInput } from '@/components/ui'
import { useToast } from '@/components/Toast'

interface UserDraft {
  firstName: string
  lastName: string
  email: string
  status: string
  avatar: number
  language: Language
}

const STATUS_LIMIT = 60

function draftOf(user: AdminUser | null): UserDraft {
  return {
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    status: user?.status ?? '',
    avatar: user?.avatar ?? Math.floor(Math.random() * 50) + 1,
    language: user?.language ?? 'fr',
  }
}

function useAdminInvalidate() {
  const client = useQueryClient()
  return () => {
    void client.invalidateQueries({ queryKey: ['adminUsers'] })
    void client.invalidateQueries({ queryKey: ['sync'] })
  }
}

function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const values = crypto.getRandomValues(new Uint32Array(12))
  return Array.from(values, (value, index) => (index > 0 && index % 4 === 0 ? '-' : '') + alphabet[value % alphabet.length]).join('')
}

function UserFormSheet({ open, user, onClose }: { open: boolean; user: AdminUser | null; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const invalidate = useAdminInvalidate()
  const [draft, setDraft] = useState<UserDraft>(() => draftOf(user))
  const [confirming, setConfirming] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setDraft(draftOf(user))
      setErrors({})
    }
  }, [open, user])

  const specs = useMemo<FieldSpec<UserDraft>[]>(
    () => [
      { key: 'firstName', label: t('admin.firstName') },
      { key: 'lastName', label: t('admin.lastName') },
      { key: 'email', label: t('admin.email') },
      { key: 'status', label: t('admin.status') },
      { key: 'avatar', label: t('profile.avatar'), format: (value) => t('profile.pigNumber', { number: value }) },
      { key: 'language', label: t('admin.language'), format: (value) => t(`languages.${value}`) },
    ],
    [t],
  )
  const lines = useMemo(() => diffFields(specs, user ? draftOf(user) : null, draft), [specs, user, draft])

  const mutation = useMutation({
    mutationFn: (body: UserDraft) =>
      user
        ? api<AdminUser>(`/api/admin/users/${user.id}`, { method: 'PUT', json: body })
        : api<AdminUser>('/api/admin/users', { method: 'POST', json: body }),
    onSuccess: invalidate,
  })

  const update = <K extends keyof UserDraft>(key: K, value: UserDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))

  const review = () => {
    const next: Record<string, string> = {}
    if (!draft.firstName.trim()) next.firstName = t('validation.required')
    if (!draft.lastName.trim()) next.lastName = t('validation.required')
    if (!/^\S+@\S+\.\S+$/.test(draft.email.trim())) next.email = t('validation.email')
    setErrors(next)
    if (Object.keys(next).length === 0) setConfirming(true)
  }

  return (
    <>
      <Sheet
        open={open && !confirming}
        onClose={onClose}
        title={user ? t('admin.editUser') : t('admin.newUser')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={review}>{t('common.review')}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput label={t('admin.firstName')} value={draft.firstName} maxLength={50} error={errors.firstName} onChange={(e) => update('firstName', e.target.value)} data-autofocus />
            <TextInput label={t('admin.lastName')} value={draft.lastName} maxLength={50} error={errors.lastName} onChange={(e) => update('lastName', e.target.value)} />
            <TextInput label={t('admin.email')} type="email" value={draft.email} maxLength={120} error={errors.email} hint={t('admin.emailHint')} onChange={(e) => update('email', e.target.value)} />
            <SelectInput
              label={t('admin.language')}
              hint={t('admin.languageHint')}
              value={draft.language}
              onChange={(e) => update('language', e.target.value as Language)}
              options={(['fr', 'en', 'ro'] as Language[]).map((language) => ({ value: language, label: t(`languages.${language}`) }))}
            />
          </div>
          <TextInput
            label={t('admin.status')}
            value={draft.status}
            maxLength={STATUS_LIMIT}
            placeholder={t('admin.statusPlaceholder')}
            hint={<span className={clsx('tabular', draft.status.length >= STATUS_LIMIT && 'font-bold text-poppy')}>{draft.status.length}/{STATUS_LIMIT}</span>}
            onChange={(e) => update('status', e.target.value)}
          />
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{t('profile.avatar')}</p>
              <PigAvatar avatar={draft.avatar} size={44} />
            </div>
            <AvatarPicker value={draft.avatar} onChange={(avatar) => update('avatar', avatar)} />
          </div>
        </div>
      </Sheet>
      <ConfirmChanges
        open={confirming}
        onClose={() => setConfirming(false)}
        mode={user ? 'update' : 'create'}
        subject={`${draft.firstName} ${draft.lastName}`}
        lines={lines}
        undoable={false}
        onConfirm={async () => {
          try {
            await mutation.mutateAsync({ ...draft, firstName: draft.firstName.trim(), lastName: draft.lastName.trim(), email: draft.email.trim(), status: draft.status.trim() })
            toast.success(user ? t('admin.userUpdated') : t('admin.userCreated'))
            setConfirming(false)
            onClose()
          } catch (error) {
            setConfirming(false)
            toast.error(error)
          }
        }}
      />
    </>
  )
}

function PasswordSheet({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (user) setPassword(generatePassword())
  }, [user])
  const save = async () => {
    setBusy(true)
    try {
      await api(`/api/admin/users/${user!.id}/password`, { method: 'PUT', json: { password } })
      toast.success(t('admin.passwordSet'))
      onClose()
    } catch (error) {
      toast.error(error)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet
      open={user !== null}
      onClose={onClose}
      title={t('admin.setPassword')}
      description={user ? `${user.firstName} ${user.lastName}` : ''}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button icon={KeyRound} onClick={save} loading={busy} disabled={password.length < 8}>
            {t('admin.applyPassword')}
          </Button>
        </>
      }
    >
      <div className="flex items-end gap-2">
        <TextInput className="flex-1" label={t('admin.newPassword')} value={password} onChange={(e) => setPassword(e.target.value)} hint={t('admin.passwordHint')} />
        <IconButton icon={Shuffle} label={t('admin.generate')} tone="solid" className="mb-6" onClick={() => setPassword(generatePassword())} />
      </div>
    </Sheet>
  )
}

export function AdminPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const online = useOnline()
  const { user: me } = useAuth()
  const invalidate = useAdminInvalidate()
  const [form, setForm] = useState<{ open: boolean; user: AdminUser | null }>({ open: false, user: null })
  const [passwordFor, setPasswordFor] = useState<AdminUser | null>(null)
  const [sendFor, setSendFor] = useState<AdminUser | null>(null)
  const [deleteFor, setDeleteFor] = useState<AdminUser | null>(null)
  const [busy, setBusy] = useState(false)
  const { data: users, isPending } = useQuery({ queryKey: ['adminUsers'], queryFn: () => api<AdminUser[]>('/api/admin/users') })

  const sendCredentials = async () => {
    if (!sendFor) return
    setBusy(true)
    try {
      await api(`/api/admin/users/${sendFor.id}/send-credentials`, { method: 'POST' })
      toast.success(t('admin.credentialsSent', { email: sendFor.email }))
      invalidate()
      setSendFor(null)
    } catch (error) {
      toast.error(error)
    } finally {
      setBusy(false)
    }
  }

  const deleteUser = async () => {
    if (!deleteFor) return
    setBusy(true)
    try {
      await api(`/api/admin/users/${deleteFor.id}`, { method: 'DELETE' })
      toast.success(t('admin.userDeleted'))
      invalidate()
      setDeleteFor(null)
    } catch (error) {
      toast.error(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page>
      <PageHeader
        title={t('admin.title')}
        subtitle={t('admin.subtitle', { count: users?.length ?? 0 })}
        actions={
          <Button icon={UserPlus} onClick={() => setForm({ open: true, user: null })} disabled={!online}>
            {t('admin.newUser')}
          </Button>
        }
      />
      {isPending ? (
        <div className="grid min-h-[40dvh] place-items-center">
          <Spinner />
        </div>
      ) : !users || users.length === 0 ? (
        <EmptyState icon={Users} title={t('admin.emptyTitle')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {users.map((user, index) => {
            const isMe = user.id === me?.id
            return (
              <motion.li
                key={user.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="flex flex-col gap-4 rounded-[1.6rem] bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:p-5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <PigAvatar avatar={user.avatar} size={56} online={user.online} />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-lg font-bold">
                        {user.firstName} {user.lastName}
                      </span>
                      {user.role === 'ADMIN' ? <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-bg">{t('admin.adminRole')}</span> : null}
                    </p>
                    <p className="truncate text-sm text-ink-soft">{user.email}</p>
                    {user.status ? <p className="truncate text-sm italic">{user.status}</p> : null}
                    <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-ink-soft">
                      <span className={user.online ? 'font-semibold text-pine' : ''}>
                        {user.online ? t('chat.online') : user.lastSeenAt ? t('chat.lastSeen', { when: relativeTime(user.lastSeenAt) }) : t('chat.neverSeen')}
                      </span>
                      <span className={clsx(!user.credentialsSentAt && 'font-semibold text-poppy')}>
                        {user.credentialsSentAt ? t('admin.sentOn', { date: formatMoment(user.credentialsSentAt) }) : t('admin.neverSent')}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                  <Button variant={user.credentialsSentAt ? 'quiet' : 'primary'} size="sm" icon={user.credentialsSentAt ? MailCheck : Mail} onClick={() => setSendFor(user)} disabled={!online}>
                    {user.credentialsSentAt ? t('admin.resend') : t('admin.send')}
                  </Button>
                  <IconButton icon={KeyRound} label={t('admin.setPassword')} tone="solid" onClick={() => setPasswordFor(user)} disabled={!online} />
                  <IconButton icon={Pencil} label={t('common.edit')} tone="solid" onClick={() => setForm({ open: true, user })} disabled={!online} />
                  {!isMe && user.role !== 'ADMIN' ? <IconButton icon={Trash2} label={t('common.delete')} tone="danger" onClick={() => setDeleteFor(user)} disabled={!online} /> : null}
                </div>
              </motion.li>
            )
          })}
        </ul>
      )}

      <UserFormSheet open={form.open} user={form.user} onClose={() => setForm({ open: false, user: null })} />
      <PasswordSheet user={passwordFor} onClose={() => setPasswordFor(null)} />
      <Sheet
        open={sendFor !== null}
        onClose={() => !busy && setSendFor(null)}
        title={t('admin.sendTitle')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSendFor(null)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button icon={Mail} onClick={sendCredentials} loading={busy} data-autofocus>
              {t('admin.send')}
            </Button>
          </>
        }
      >
        {sendFor ? <p className="text-ink-soft">{t('admin.sendText', { name: sendFor.firstName, email: sendFor.email })}</p> : null}
      </Sheet>
      <Sheet
        open={deleteFor !== null}
        onClose={() => !busy && setDeleteFor(null)}
        title={t('admin.deleteTitle')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteFor(null)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" icon={Trash2} onClick={deleteUser} loading={busy}>
              {t('common.delete')}
            </Button>
          </>
        }
      >
        {deleteFor ? (
          <div className="flex items-center gap-3">
            <PigAvatar avatar={deleteFor.avatar} size={48} />
            <p className="text-ink-soft">{t('admin.deleteText', { name: `${deleteFor.firstName} ${deleteFor.lastName}` })}</p>
          </div>
        ) : null}
      </Sheet>
    </Page>
  )
}
