import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'

interface PopoverProps {
  open: boolean
  onClose: () => void
  anchor: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  side?: 'top' | 'bottom'
  className?: string
}

export function Popover({ open, onClose, anchor, children, align = 'right', side = 'top', className }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useLayoutEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) closeRef.current()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={clsx('relative', className)}>
      {anchor}
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: side === 'top' ? 8 : -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: side === 'top' ? 8 : -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
            className={clsx(
              'absolute z-30',
              side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
              align === 'right' ? 'right-0 origin-bottom-right' : 'left-0 origin-bottom-left',
            )}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
