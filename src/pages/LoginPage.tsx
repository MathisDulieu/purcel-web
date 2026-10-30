import { useState, type FormEvent } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { errorMessage } from '@/components/Toast'
import { Button, TextInput } from '@/components/ui'
import { LanguageSwitch, ThemeToggle } from '@/components/Preferences'
import { Logo } from '@/components/Logo'

const LINE = 'M30 250 C 110 250, 120 120, 210 120 S 320 230, 400 200 S 470 70, 560 80 S 640 190, 700 170'
const STATIONS = [
  { x: 30, y: 250, day: 12, dy: -26 },
  { x: 128, y: 168, day: 13, dy: -26 },
  { x: 210, y: 120, day: 14, dy: -26 },
  { x: 300, y: 196, day: 15, dy: 46 },
  { x: 400, y: 200, day: 16, dy: 46 },
  { x: 486, y: 104, day: 17, dy: -26 },
  { x: 590, y: 98, day: 18, dy: -26 },
  { x: 700, y: 170, day: 19, dy: 46 },
]

function TripLine() {
  const reduced = useReducedMotion()
  return (
    <svg viewBox="0 0 730 300" className="w-full" aria-hidden="true">
      <motion.path
        d={LINE}
        fill="none"
        stroke="var(--saffron)"
        strokeWidth="10"
        strokeLinecap="round"
        initial={{ pathLength: reduced ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.8, ease: [0.65, 0, 0.35, 1], delay: 0.2 }}
      />
      {STATIONS.map((station, index) => (
        <motion.g
          key={station.day}
          initial={{ scale: reduced ? 1 : 0, opacity: reduced ? 1 : 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.35 + index * 0.2, type: 'spring', stiffness: 420, damping: 18 }}
          style={{ transformOrigin: `${station.x}px ${station.y}px` }}
        >
          <circle cx={station.x} cy={station.y} r="13" fill="#FFFFFF" stroke="#121A33" strokeWidth="5" />
          <text
            x={station.x}
            y={station.y + station.dy}
            textAnchor="middle"
            fill="#FFFFFF"
            fontFamily="var(--font-display)"
            fontWeight="800"
            fontSize="30"
          >
            {station.day}
          </text>
        </motion.g>
      ))}
      {!reduced ? (
        <g>
          <g>
            <circle r="17" fill="#F5A9BC" stroke="#121A33" strokeWidth="4" />
            <ellipse cx="-4.5" cy="1" rx="2.6" ry="3.8" fill="#121A33" />
            <ellipse cx="4.5" cy="1" rx="2.6" ry="3.8" fill="#121A33" />
            <animateMotion dur="7s" begin="2s" repeatCount="indefinite" path={LINE} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
          </g>
        </g>
      ) : null}
    </svg>
  )
}

export function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(email.trim(), password)
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 401 ? t('login.invalid') : errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  const title = t('login.city')

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.15fr_1fr]">
      <section className="relative flex flex-col justify-between overflow-hidden bg-[#2443C6] px-6 pt-6 pb-8 text-white sm:px-10 lg:py-10 dark:bg-[#141f5c]">
        <div className="flex items-center justify-between">
          <span className="[&_rect]:fill-white/15">
            <Logo />
          </span>
        </div>
        <div className="mt-8 lg:mt-0">
          <h1 className="font-display text-[clamp(4rem,13vw,10.5rem)] leading-[0.82] font-black tracking-[-0.02em]" aria-label={title}>
            {Array.from(title).map((letter, index) => (
              <motion.span
                key={`${letter}-${index}`}
                className="inline-block"
                initial={{ y: '0.6em', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.05 * index, type: 'spring', stiffness: 260, damping: 20 }}
                aria-hidden="true"
              >
                {letter}
              </motion.span>
            ))}
          </h1>
          <p className="mt-4 max-w-md text-lg text-white/80 sm:text-xl">{t('login.dates')}</p>
        </div>
        <div className="mt-6 -mx-2 max-w-3xl lg:mt-0">
          <TripLine />
        </div>
      </section>

      <section className="relative flex flex-col px-6 py-6 sm:px-10 lg:py-10">
        <div className="flex items-center justify-end gap-2">
          <LanguageSwitch />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
            <h2 className="font-display text-5xl leading-none font-extrabold tracking-tight">{t('login.title')}</h2>
            <p className="mt-3 text-ink-soft">{t('login.subtitle')}</p>
            <form onSubmit={submit} className="mt-8 flex flex-col gap-4" noValidate>
              <TextInput
                label={t('login.email')}
                type="email"
                autoComplete="username"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <div className="relative">
                <TextInput
                  label={t('login.password')}
                  type={visible ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setVisible((value) => !value)}
                  className="absolute right-2 bottom-1.5 grid size-9 place-items-center rounded-full text-ink-soft hover:bg-surface-2"
                  aria-label={visible ? t('login.hide') : t('login.show')}
                >
                  {visible ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                </button>
              </div>
              {error ? (
                <motion.p initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }} className="rounded-xl bg-poppy-soft px-3.5 py-2.5 text-sm font-medium text-poppy" role="alert">
                  {error}
                </motion.p>
              ) : null}
              <Button type="submit" size="lg" icon={LogIn} loading={busy} disabled={!email || !password} className="mt-2">
                {t('login.submit')}
              </Button>
            </form>
            <p className="mt-8 text-sm text-ink-soft">{t('login.noAccount')}</p>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
