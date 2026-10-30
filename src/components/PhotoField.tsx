import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { api, fileUrl } from '@/lib/api'
import { compressImage } from '@/lib/image'
import type { StoredFile } from '@/lib/types'
import { Spinner } from '@/components/ui'
import { useToast } from '@/components/Toast'

export async function uploadImage(file: File, kind: string) {
  const compressed = await compressImage(file)
  const form = new FormData()
  form.append('file', compressed, compressed.name)
  form.append('kind', kind)
  return api<StoredFile>('/api/files', { method: 'POST', form })
}

export function PhotoField({ value, onChange, max = 12 }: { value: string[]; onChange: (ids: string[]) => void; max?: number }) {
  const { t } = useTranslation()
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(0)

  const add = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const list = Array.from(files).slice(0, Math.max(0, max - value.length))
    setPending(list.length)
    const added: string[] = []
    for (const file of list) {
      try {
        const stored = await uploadImage(file, 'activity')
        added.push(stored.id)
      } catch (error) {
        toast.error(error)
      } finally {
        setPending((count) => count - 1)
      }
    }
    onChange([...value, ...added])
    if (input.current) input.current.value = ''
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">{t('activity.photos')}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        <AnimatePresence initial={false}>
          {value.map((id, index) => (
            <motion.div
              key={id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="group relative aspect-square overflow-hidden rounded-2xl bg-surface-2"
            >
              <img src={fileUrl(id)} alt="" className="size-full object-cover" loading="lazy" />
              {index === 0 ? <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ink/80 px-2 py-0.5 text-[0.65rem] font-bold text-bg">{t('activity.cover')}</span> : null}
              <button
                type="button"
                onClick={() => onChange(value.filter((entry) => entry !== id))}
                className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-ink/80 text-bg hover:bg-poppy"
                aria-label={t('common.remove')}
              >
                <X className="size-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {Array.from({ length: pending }, (_, index) => (
          <div key={`pending-${index}`} className="grid aspect-square place-items-center rounded-2xl bg-surface-2">
            <Spinner className="size-5" />
          </div>
        ))}
        {value.length + pending < max ? (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="grid aspect-square place-items-center rounded-2xl border-[1.5px] border-dashed border-line text-ink-soft hover:border-cobalt hover:text-cobalt"
          >
            <span className="flex flex-col items-center gap-1 text-xs font-semibold">
              <ImagePlus className="size-6" />
              {t('activity.addPhoto')}
            </span>
          </button>
        ) : null}
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(event) => void add(event.target.files)} />
    </div>
  )
}
