import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react'

interface LightboxProps {
  images: string[]
  index: number | null
  onIndex: (index: number | null) => void
  downloadUrl?: (index: number) => string
}

export function Lightbox({ images, index, onIndex, downloadUrl }: LightboxProps) {
  const { t } = useTranslation()
  const open = index !== null && images.length > 0
  const current = index ?? 0

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onIndex(null)
      if (event.key === 'ArrowRight') onIndex((current + 1) % images.length)
      if (event.key === 'ArrowLeft') onIndex((current - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, current, images.length, onIndex])

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[70] flex flex-col bg-[#05070f]/95"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
            <span className="px-2 text-sm font-semibold tabular">
              {current + 1} / {images.length}
            </span>
            <div className="flex items-center gap-1">
              {downloadUrl ? (
                <a href={downloadUrl(current)} className="grid size-11 place-items-center rounded-full hover:bg-white/10" aria-label={t('common.download')}>
                  <Download className="size-5" />
                </a>
              ) : null}
              <button type="button" onClick={() => onIndex(null)} className="grid size-11 place-items-center rounded-full hover:bg-white/10" aria-label={t('common.close')}>
                <X className="size-6" />
              </button>
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.img
                key={images[current]}
                src={images[current]}
                alt=""
                className="max-h-full max-w-full touch-pan-y rounded-xl object-contain select-none"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                drag={images.length > 1 ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -80) onIndex((current + 1) % images.length)
                  if (info.offset.x > 80) onIndex((current - 1 + images.length) % images.length)
                }}
                draggable={false}
              />
            </AnimatePresence>
            {images.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => onIndex((current - 1 + images.length) % images.length)}
                  className="absolute left-3 hidden size-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 md:grid"
                  aria-label={t('common.previous')}
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={() => onIndex((current + 1) % images.length)}
                  className="absolute right-3 hidden size-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 md:grid"
                  aria-label={t('common.next')}
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
