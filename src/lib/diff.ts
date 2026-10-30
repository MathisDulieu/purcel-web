export interface FieldSpec<T> {
  key: keyof T & string
  label: string
  format?: (value: unknown, source: T) => string
}

export type ChangeKind = 'added' | 'removed' | 'changed'

export interface ChangeLine {
  label: string
  kind: ChangeKind
  before: string
  after: string
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.length === 0 ? '' : String(value.length)
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  return String(value).trim()
}

export function diffFields<T>(specs: FieldSpec<T>[], before: T | null, after: T | null): ChangeLine[] {
  const lines: ChangeLine[] = []
  for (const spec of specs) {
    const read = (source: T | null) => {
      if (!source) return ''
      const raw = source[spec.key]
      if (raw === null || raw === undefined || (Array.isArray(raw) && raw.length === 0) || raw === '') return ''
      return spec.format ? spec.format(raw, source) : stringify(raw)
    }
    const previous = read(before)
    const next = read(after)
    if (previous === next) continue
    if (!previous) lines.push({ label: spec.label, kind: 'added', before: '', after: next })
    else if (!next) lines.push({ label: spec.label, kind: 'removed', before: previous, after: '' })
    else lines.push({ label: spec.label, kind: 'changed', before: previous, after: next })
  }
  return lines
}
