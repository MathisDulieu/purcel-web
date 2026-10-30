import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Check, TriangleAlert } from 'lucide-react'
import i18n from '@/lib/i18n'
import { ApiError } from '@/lib/api'

interface Toast {
  id: number
  tone: 'success' | 'error'
  message: string
}

interface ToastContextValue {
  success: (message: string) => void
  error: (error: unknown) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const key = `errors.${error.code}`
    return i18n.exists(key) ? i18n.t(key) : i18n.t('errors.UNKNOWN')
  }
  return i18n.t('errors.UNKNOWN')
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((tone: Toast['tone'], message: string) => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current.slice(-2), { id, tone, message }])
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), tone === 'error' ? 6000 : 3200)
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message) => push('success', message),
      error: (error) => push('error', errorMessage(error)),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 p-4 pt-[max(1rem,env(safe-area-inset-top))]" aria-live="polite">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: -24, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-bg shadow-card"
              >
                <span className={toast.tone === 'success' ? 'grid size-6 place-items-center rounded-full bg-pine text-white' : 'grid size-6 place-items-center rounded-full bg-poppy text-white'}>
                  {toast.tone === 'success' ? <Check className="size-3.5" strokeWidth={3} /> : <TriangleAlert className="size-3.5" strokeWidth={2.6} />}
                </span>
                {toast.message}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('ToastProvider missing')
  return context
}
