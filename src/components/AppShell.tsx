import { useState } from 'react'
import { NavLink, useLocation, useOutlet, Link } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  CalendarDays,
  Ellipsis,
  FolderOpen,
  History,
  LogOut,
  MessageCircle,
  Route,
  ShieldCheck,
  Sparkles,
  WifiOff,
  type LucideIcon,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useSync } from '@/lib/data'
import { formatMoment } from '@/lib/format'
import { useOnline } from '@/lib/online'
import { PigAvatar } from '@/components/PigAvatar'
import { LanguageSwitch, ThemeToggle } from '@/components/Preferences'
import { Sheet } from '@/components/Sheet'
import { Logo } from '@/components/Logo'

interface NavItem {
  to: string
  key: string
  icon: LucideIcon
  admin?: boolean
}

const NAV: NavItem[] = [
  { to: '/', key: 'planning', icon: CalendarDays },
  { to: '/activities', key: 'activities', icon: Sparkles },
  { to: '/transports', key: 'transports', icon: Route },
  { to: '/documents', key: 'documents', icon: FolderOpen },
  { to: '/chat', key: 'chat', icon: MessageCircle },
  { to: '/history', key: 'history', icon: History },
  { to: '/admin', key: 'admin', icon: ShieldCheck, admin: true },
]

const MOBILE_PRIMARY = ['planning', 'activities', 'documents', 'chat']

function useUnread() {
  const { token } = useAuth()
  const { data } = useQuery({
    queryKey: ['chatUnread'],
    queryFn: () => api<{ count: number }>('/api/chat/unread'),
    enabled: token !== null,
    refetchInterval: 60_000,
  })
  return data?.count ?? 0
}

function isActive(pathname: string, to: string) {
  return to === '/' ? pathname === '/' || pathname.startsWith('/planning') : pathname.startsWith(to)
}

function OfflineBanner() {
  const online = useOnline()
  const { t } = useTranslation()
  const { dataUpdatedAt } = useSync()
  return (
    <AnimatePresence>
      {!online ? (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          exit={{ height: 0 }}
          className="overflow-hidden bg-saffron text-[#121A33]"
          role="status"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold">
            <WifiOff className="size-4" strokeWidth={2.4} />
            <span>
              {t('offline.banner')}
              {dataUpdatedAt ? ` ${t('offline.updated', { date: formatMoment(new Date(dataUpdatedAt).toISOString()) })}` : ''}
            </span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function Sidebar({ unread }: { unread: number }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { user, isAdmin, logout } = useAuth()
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line px-4 py-6 lg:flex">
      <Link to="/" className="mb-8 px-2">
        <Logo />
      </Link>
      <nav className="flex flex-col gap-1" aria-label={t('nav.main')}>
        {NAV.filter((item) => !item.admin || isAdmin).map((item) => {
          const active = isActive(pathname, item.to)
          return (
            <NavLink
              key={item.key}
              to={item.to}
              className={clsx(
                'relative flex h-11 items-center gap-3 rounded-2xl px-3 font-semibold transition-colors',
                active ? 'text-on-cobalt' : 'text-ink-soft hover:bg-surface-2 hover:text-ink',
              )}
            >
              {active ? (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-2xl bg-cobalt"
                  transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                />
              ) : null}
              <item.icon className="relative size-5" strokeWidth={2.2} />
              <span className="relative">{t(`nav.${item.key}`)}</span>
              {item.key === 'chat' && unread > 0 ? (
                <span className="relative ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-poppy px-1.5 text-xs font-bold text-white tabular">
                  {unread > 99 ? '99+' : unread}
                </span>
              ) : null}
            </NavLink>
          )
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <LanguageSwitch compact />
          <ThemeToggle />
        </div>
        {user ? (
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-2.5">
            <Link to="/profile" className="flex min-w-0 flex-1 items-center gap-3" aria-label={t('nav.profile')}>
              <PigAvatar avatar={user.avatar} size={40} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">
                  {user.firstName} {user.lastName}
                </span>
                <span className="block truncate text-xs text-ink-soft">{user.status || t('nav.profile')}</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-surface-2 hover:text-poppy"
              aria-label={t('nav.logout')}
              title={t('nav.logout')}
            >
              <LogOut className="size-4.5" />
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  )
}

function MobileNav({ unread }: { unread: number }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { user, isAdmin, logout } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)
  const primary = NAV.filter((item) => MOBILE_PRIMARY.includes(item.key))
  const secondary = NAV.filter((item) => !MOBILE_PRIMARY.includes(item.key) && (!item.admin || isAdmin))
  const moreActive = secondary.some((item) => isActive(pathname, item.to)) || pathname.startsWith('/profile')

  return (
    <>
      <nav
        aria-label={t('nav.main')}
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2">
          {primary.map((item) => {
            const active = isActive(pathname, item.to)
            return (
              <NavLink key={item.key} to={item.to} className="relative flex flex-1 flex-col items-center gap-0.5 pt-2.5 pb-2">
                <span className={clsx('relative grid h-8 w-14 place-items-center rounded-full transition-colors', active ? 'text-on-cobalt' : 'text-ink-soft')}>
                  {active ? (
                    <motion.span layoutId="mobile-nav-active" className="absolute inset-0 rounded-full bg-cobalt" transition={{ type: 'spring', stiffness: 480, damping: 36 }} />
                  ) : null}
                  <item.icon className="relative size-5" strokeWidth={2.2} />
                  {item.key === 'chat' && unread > 0 ? (
                    <span className="absolute -top-0.5 right-2 grid h-4 min-w-4 place-items-center rounded-full bg-poppy px-1 text-[0.65rem] font-bold text-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  ) : null}
                </span>
                <span className={clsx('text-[0.7rem] font-semibold', active ? 'text-ink' : 'text-ink-soft')}>{t(`nav.${item.key}`)}</span>
              </NavLink>
            )
          })}
          <button type="button" onClick={() => setMoreOpen(true)} className="relative flex flex-1 flex-col items-center gap-0.5 pt-2.5 pb-2">
            <span className={clsx('relative grid h-8 w-14 place-items-center rounded-full', moreActive ? 'bg-cobalt text-on-cobalt' : 'text-ink-soft')}>
              <Ellipsis className="size-5" strokeWidth={2.2} />
            </span>
            <span className={clsx('text-[0.7rem] font-semibold', moreActive ? 'text-ink' : 'text-ink-soft')}>{t('nav.more')}</span>
          </button>
        </div>
      </nav>
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title={t('nav.more')} size="sm">
        <div className="flex flex-col gap-1">
          {user ? (
            <Link to="/profile" onClick={() => setMoreOpen(false)} className="mb-3 flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
              <PigAvatar avatar={user.avatar} size={48} />
              <span className="min-w-0">
                <span className="block truncate font-bold">
                  {user.firstName} {user.lastName}
                </span>
                <span className="block truncate text-sm text-ink-soft">{t('nav.profile')}</span>
              </span>
            </Link>
          ) : null}
          {secondary.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              onClick={() => setMoreOpen(false)}
              className={clsx('flex h-12 items-center gap-3 rounded-2xl px-3 font-semibold', isActive(pathname, item.to) ? 'bg-cobalt text-on-cobalt' : 'hover:bg-surface-2')}
            >
              <item.icon className="size-5" strokeWidth={2.2} />
              {t(`nav.${item.key}`)}
            </Link>
          ))}
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-surface-2 p-2 pl-3">
            <LanguageSwitch />
            <ThemeToggle className="bg-surface" />
          </div>
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false)
              void logout()
            }}
            className="mt-2 flex h-12 items-center gap-3 rounded-2xl px-3 font-semibold text-poppy hover:bg-poppy-soft"
          >
            <LogOut className="size-5" />
            {t('nav.logout')}
          </button>
        </div>
      </Sheet>
    </>
  )
}

export function AppShell() {
  const location = useLocation()
  const outlet = useOutlet()
  const unread = useUnread()
  const section = location.pathname.split('/')[1] ?? ''

  return (
    <div className="flex min-h-dvh">
      <Sidebar unread={unread} />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <main className={clsx('flex-1', section === 'chat' ? 'pb-0' : 'pb-28 lg:pb-10')}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <MobileNav unread={unread} />
    </div>
  )
}

export function Page({ children, wide = false, className }: { children: React.ReactNode; wide?: boolean; className?: string }) {
  return <div className={clsx('mx-auto w-full px-4 pt-5 sm:px-6 lg:px-10 lg:pt-10', wide ? 'max-w-7xl' : 'max-w-5xl', className)}>{children}</div>
}

export function PageHeader({ title, subtitle, actions, back }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode; back?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back}
        <h1 className="font-display text-[2.75rem] leading-[0.9] font-extrabold tracking-tight sm:text-6xl">{title}</h1>
        {subtitle ? <div className="mt-2 text-ink-soft">{subtitle}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}
