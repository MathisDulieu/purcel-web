import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'
import { LoaderCircle, type LucideIcon } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  loading?: boolean
}

const variants: Record<Variant, string> = {
  primary: 'bg-cobalt text-on-cobalt hover:brightness-110 active:brightness-95 shadow-[0_8px_20px_-10px_var(--cobalt)]',
  secondary: 'bg-surface text-ink border-[1.5px] border-line hover:border-ink-faint',
  ghost: 'text-ink hover:bg-surface-2',
  danger: 'bg-poppy text-white hover:brightness-110',
  quiet: 'bg-surface-2 text-ink hover:bg-surface-3',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-[0.95rem] gap-2 rounded-2xl',
  lg: 'h-13 px-6 text-base gap-2.5 rounded-2xl',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return clsx(
    'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-[filter,background-color,border-color,transform] duration-150 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100',
    variants[variant],
    sizes[size],
    className,
  )
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon: Icon, loading = false, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={buttonClass(variant, size, className)}
      {...props}
    >
      {loading ? <LoaderCircle className="size-[1.15em] animate-spin" /> : Icon ? <Icon className="size-[1.15em]" strokeWidth={2.2} /> : null}
      {children}
    </button>
  )
})

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  label: string
  tone?: 'default' | 'danger' | 'solid'
  size?: 'sm' | 'md'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, tone = 'default', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-150 disabled:opacity-40',
        size === 'sm' ? 'size-8' : 'size-10',
        tone === 'danger' && 'text-poppy hover:bg-poppy-soft',
        tone === 'default' && 'text-ink-soft hover:bg-surface-2 hover:text-ink',
        tone === 'solid' && 'bg-surface-2 text-ink hover:bg-surface-3',
        className,
      )}
      {...props}
    >
      <Icon className={size === 'sm' ? 'size-4' : 'size-[1.2rem]'} strokeWidth={2.2} />
    </button>
  )
})

interface FieldShellProps {
  label: string
  hint?: ReactNode
  error?: string
  children: (id: string) => ReactNode
  className?: string
}

export function FieldShell({ label, hint, error, children, className }: FieldShellProps) {
  const id = useId()
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children(id)}
      {error ? <p className="text-sm text-poppy">{error}</p> : hint ? <p className="text-xs text-ink-soft">{hint}</p> : null}
    </div>
  )
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: ReactNode
  error?: string
}

export function TextInput({ label, hint, error, className, ...props }: TextInputProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      {(id) => <input id={id} className="field" aria-invalid={error ? true : undefined} {...props} />}
    </FieldShell>
  )
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: ReactNode
  error?: string
}

export function TextArea({ label, hint, error, className, rows = 3, ...props }: TextAreaProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      {(id) => <textarea id={id} rows={rows} className="field resize-y" {...props} />}
    </FieldShell>
  )
}

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: { value: string; label: string }[]
  hint?: ReactNode
}

export function SelectInput({ label, options, hint, className, ...props }: SelectInputProps) {
  return (
    <FieldShell label={label} hint={hint} className={className}>
      {(id) => (
        <select id={id} className="field appearance-none bg-[length:1rem] pr-10" {...props}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={clsx('animate-spin text-ink-soft', className ?? 'size-6')} />
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[1.75rem] border-[1.5px] border-dashed border-line px-6 py-14 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-full bg-surface-2 text-ink-soft">
        <Icon className="size-6" />
      </div>
      <p className="font-display text-2xl font-bold">{title}</p>
      {text ? <p className="mt-1 max-w-sm text-ink-soft">{text}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function Chip({ color, children, className }: { color?: string; children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', className)}
      style={color ? { backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`, color } : undefined}
    >
      {color ? <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} /> : null}
      {children}
    </span>
  )
}
