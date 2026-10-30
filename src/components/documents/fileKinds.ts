import { File, FileArchive, FileImage, FileSpreadsheet, FileText, FileVideo, type LucideIcon } from 'lucide-react'

export type FileKind = 'pdf' | 'image' | 'text' | 'sheet' | 'archive' | 'video' | 'other'

export function fileKind(contentType: string, name = ''): FileKind {
  const type = contentType.toLowerCase()
  const lower = name.toLowerCase()
  if (type === 'application/pdf' || lower.endsWith('.pdf')) return 'pdf'
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('text/') || type === 'application/json' || /\.(txt|md|csv|json)$/.test(lower)) return 'text'
  if (type.includes('spreadsheet') || type.includes('excel') || /\.(xlsx?|ods)$/.test(lower)) return 'sheet'
  if (type.includes('zip') || type.includes('compressed') || /\.(zip|rar|7z)$/.test(lower)) return 'archive'
  return 'other'
}

export const KIND_META: Record<FileKind, { icon: LucideIcon; color: string }> = {
  pdf: { icon: FileText, color: 'var(--poppy)' },
  image: { icon: FileImage, color: 'var(--line-nature)' },
  text: { icon: FileText, color: 'var(--cobalt)' },
  sheet: { icon: FileSpreadsheet, color: 'var(--pine)' },
  archive: { icon: FileArchive, color: 'var(--line-meal)' },
  video: { icon: FileVideo, color: 'var(--line-culture)' },
  other: { icon: File, color: 'var(--ink-soft)' },
}

export function viewable(kind: FileKind) {
  return kind === 'pdf' || kind === 'image' || kind === 'text' || kind === 'video'
}
