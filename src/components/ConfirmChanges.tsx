import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { ArrowRight, Minus, PenLine, Plus } from 'lucide-react'
import clsx from 'clsx'
import { Sheet } from '@/components/Sheet'
import { Button } from '@/components/ui'
import type { ChangeLine } from '@/lib/diff'

interface ConfirmChangesProps {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<unknown> | void
  mode: 'create' | 'update' | 'delete'
  subject: string
  lines: ChangeLine[]
  undoable?: boolean
}

const kindStyles = {
  added: { icon: Plus, className: 'bg-pine-soft text-pine' },
  removed: { icon: Minus, className: 'bg-poppy-soft text-poppy' },
  changed: { icon: PenLine, className: 'bg-saffron-soft text-[color-mix(in_oklab,var(--saffron)_60%,var(--ink))]' },
}

export function ConfirmChanges({ open, onClose, onConfirm, mode, subject, lines, undoable = true }: ConfirmChangesProps) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  const counts = {
    added: lines.filter((line) => line.kind === 'added').length,
    removed: lines.filter((line) => line.kind === 'removed').length,
    changed: lines.filter((line) => line.kind === 'changed').length,
  }

  return (
    <Sheet
      open={open}
      onClose={() => !busy && onClose()}
      title={t(`confirm.title.${mode}`)}
      description={subject}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('confirm.back')}
          </Button>
          <Button variant={mode === 'delete' ? 'danger' : 'primary'} onClick={confirm} loading={busy} data-autofocus>
            {t(`confirm.action.${mode}`)}
          </Button>
        </>
      }
    >
      {mode === 'update' && lines.length === 0 ? (
        <p className="rounded-2xl bg-surface-2 px-4 py-3 text-ink-soft">{t('confirm.nothing')}</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            {(['added', 'changed', 'removed'] as const)
              .filter((kind) => counts[kind] > 0)
              .map((kind) => (
                <span key={kind} className={clsx('rounded-full px-3 py-1 font-semibold', kindStyles[kind].className)}>
                  {t(`confirm.count.${kind}`, { count: counts[kind] })}
                </span>
              ))}
          </div>
          <ul className="flex flex-col gap-2">
            {lines.map((line, index) => {
              const Icon = kindStyles[line.kind].icon
              return (
                <motion.li
                  key={`${line.label}-${index}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(index * 0.035, 0.4) }}
                  className="flex items-start gap-3 rounded-2xl border border-line px-3.5 py-3"
                >
                  <span className={clsx('mt-0.5 grid size-6 shrink-0 place-items-center rounded-full', kindStyles[line.kind].className)}>
                    <Icon className="size-3.5" strokeWidth={2.8} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{line.label}</p>
                    {line.kind === 'changed' ? (
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm break-words">
                        <span className="text-ink-soft line-through decoration-poppy/60">{line.before}</span>
                        <ArrowRight className="size-3.5 shrink-0 text-ink-faint" />
                        <span className="font-medium">{line.after}</span>
                      </p>
                    ) : (
                      <p className={clsx('mt-0.5 text-sm break-words', line.kind === 'removed' ? 'text-ink-soft line-through decoration-poppy/60' : '')}>
                        {line.kind === 'added' ? line.after : line.before}
                      </p>
                    )}
                  </div>
                </motion.li>
              )
            })}
          </ul>
        </>
      )}
      <p className="mt-4 text-sm text-ink-soft">{undoable ? t('confirm.undoable') : t('confirm.definitive')}</p>
    </Sheet>
  )
}
