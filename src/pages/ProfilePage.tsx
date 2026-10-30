import { useEffect, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { KeyRound, LogOut, Save } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { ChangeLine } from '@/lib/diff'
import { useOnline } from '@/lib/online'
import type { UserProfile } from '@/lib/types'
import { Page } from '@/components/AppShell'
import { AvatarPicker } from '@/components/AvatarPicker'
import { ConfirmChanges } from '@/components/ConfirmChanges'
import { PigAvatar } from '@/components/PigAvatar'
import { LanguageSwitch, ThemeToggle } from '@/components/Preferences'
import { Button, Spinner, TextInput } from '@/components/ui'
import { useToast } from '@/components/Toast'

function Section({ title, text, children }: { title: string; text?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.75rem] bg-surface p-5 shadow-card sm:p-7">
      <h2 className="font-display text-3xl leading-none font-extrabold">{title}</h2>
      {text ? <p className="mt-1.5 text-sm text-ink-soft">{text}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  )
}

export function ProfilePage() {
  const { t } = useTranslation()
  const toast = useToast()
  const client = useQueryClient()
  const online = useOnline()
  const { user, logout } = useAuth()
  const [avatar, setAvatar] = useState(user?.avatar ?? 1)
  const [email, setEmail] = useState(user?.email ?? '')
  const [confirming, setConfirming] = useState(false)
  const [passwords, setPasswords] = useState({ current: '', next: '', repeat: '' })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    if (user) {
      setAvatar(user.avatar)
      setEmail(user.email)
    }
  }, [user])

  if (!user) {
    return (
      <div className="grid min-h-[60dvh] place-items-center">
        <Spinner />
      </div>
    )
  }

  const lines: ChangeLine[] = []
  if (avatar !== user.avatar) lines.push({ label: t('profile.avatar'), kind: 'changed', before: t('profile.pigNumber', { number: user.avatar }), after: t('profile.pigNumber', { number: avatar }) })
  if (email.trim().toLowerCase() !== user.email) lines.push({ label: t('profile.email'), kind: 'changed', before: user.email, after: email.trim().toLowerCase() })

  const saveProfile = async () => {
    try {
      const updated = await api<UserProfile>('/api/me', { method: 'PUT', json: { email: email.trim(), avatar } })
      client.setQueryData(['me'], updated)
      void client.invalidateQueries({ queryKey: ['sync'] })
      toast.success(t('profile.saved'))
    } catch (error) {
      toast.error(error)
    } finally {
      setConfirming(false)
    }
  }

  const changePassword = async (event: FormEvent) => {
    event.preventDefault()
    setPasswordError(null)
    if (passwords.next.length < 8) {
      setPasswordError(t('validation.passwordLength'))
      return
    }
    if (passwords.next !== passwords.repeat) {
      setPasswordError(t('validation.passwordMatch'))
      return
    }
    setSavingPassword(true)
    try {
      await api('/api/me/password', { method: 'PUT', json: { currentPassword: passwords.current, newPassword: passwords.next } })
      setPasswords({ current: '', next: '', repeat: '' })
      toast.success(t('profile.passwordChanged'))
    } catch (error) {
      toast.error(error)
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <Page>
      <header className="mb-8 flex flex-col items-start gap-5 sm:flex-row sm:items-end">
        <motion.div key={avatar} initial={{ rotate: -12, scale: 0.85 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }}>
          <PigAvatar avatar={avatar} size={128} />
        </motion.div>
        <div className="min-w-0">
          <h1 className="font-display text-5xl leading-[0.9] font-black tracking-tight sm:text-6xl">
            {user.firstName} {user.lastName}
          </h1>
          {user.status ? <p className="mt-2 text-lg text-ink-soft">{user.status}</p> : null}
        </div>
      </header>

      <div className="flex flex-col gap-5">
        <Section title={t('profile.identity')} text={t('profile.identityText')}>
          <div className="flex flex-col gap-5">
            <TextInput label={t('profile.email')} type="email" value={email} onChange={(event) => setEmail(event.target.value)} hint={t('profile.emailHint')} />
            <div>
              <p className="mb-3 text-sm font-semibold">{t('profile.avatar')}</p>
              <AvatarPicker value={avatar} onChange={setAvatar} />
            </div>
            <div className="flex justify-end">
              <Button icon={Save} onClick={() => setConfirming(true)} disabled={!online || lines.length === 0 || !email.includes('@')}>
                {t('common.review')}
              </Button>
            </div>
          </div>
        </Section>

        <Section title={t('profile.password')} text={t('profile.passwordText')}>
          <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-3">
            <TextInput label={t('profile.currentPassword')} type="password" autoComplete="current-password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} />
            <TextInput label={t('profile.newPassword')} type="password" autoComplete="new-password" value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} />
            <TextInput label={t('profile.repeatPassword')} type="password" autoComplete="new-password" value={passwords.repeat} onChange={(e) => setPasswords({ ...passwords, repeat: e.target.value })} />
            {passwordError ? <p className="text-sm font-medium text-poppy sm:col-span-3">{passwordError}</p> : null}
            <div className="flex justify-end sm:col-span-3">
              <Button type="submit" icon={KeyRound} loading={savingPassword} disabled={!online || !passwords.current || !passwords.next}>
                {t('profile.changePassword')}
              </Button>
            </div>
          </form>
        </Section>

        <Section title={t('profile.preferences')}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-2 text-sm font-semibold">{t('profile.language')}</p>
              <LanguageSwitch />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">{t('profile.theme')}</p>
              <ThemeToggle />
            </div>
            <Button variant="ghost" icon={LogOut} className="text-poppy" onClick={() => void logout()}>
              {t('nav.logout')}
            </Button>
          </div>
        </Section>
      </div>

      <ConfirmChanges open={confirming} onClose={() => setConfirming(false)} onConfirm={saveProfile} mode="update" subject={`${user.firstName} ${user.lastName}`} lines={lines} undoable={false} />
    </Page>
  )
}
