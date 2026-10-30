import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { IconButton } from '@/components/ui'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  dismissible?: boolean
}

const widths = {
  sm: 'md:max-w-md',
  md: 'md:max-w-xl',
  lg: 'md:max-w-3xl',
  xl: 'md:max-w-5xl',
}

let openCount = 0

export function Sheet({ open, onClose, title, description, children, footer, size = 'md', dismissible = true }: SheetProps) {
  const { t } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useLayoutEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    openCount++
    document.body.style.overflow = 'hidden'
    const previous = document.activeElement as HTMLElement | null
    const frame = requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector<HTMLElement>('[data-autofocus], input, textarea, select')
      ;(target ?? panelRef.current)?.focus({ preventScroll: true })
    })
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) {
        event.stopPropagation()
        closeRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKey)
      openCount--
      if (openCount === 0) document.body.style.overflow = ''
      previous?.focus?.({ preventScroll: true })
    }
  }, [open, dismissible])

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
          <motion.div
            className="absolute inset-0 bg-[#060a18]/55 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => dismissible && onClose()}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className={clsx(
              'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-surface shadow-card outline-none md:rounded-[1.75rem]',
              widths[size],
            )}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-surface-3 md:hidden" />
            <header className="flex items-start gap-3 px-5 pt-4 pb-3 md:px-7 md:pt-6">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-[1.9rem] leading-none font-extrabold tracking-tight">{title}</h2>
                {description ? <div className="mt-1.5 text-sm text-ink-soft">{description}</div> : null}
              </div>
              {dismissible ? <IconButton icon={X} label={t('common.close')} onClick={onClose} /> : null}
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 md:px-7 md:pb-7">{children}</div>
            {footer ? (
              <footer className="safe-bottom flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface px-5 py-3.5 md:px-7">
                {footer}
              </footer>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
