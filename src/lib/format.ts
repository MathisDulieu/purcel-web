import { differenceInCalendarDays, format, formatDistanceToNowStrict, isToday, isYesterday, parseISO } from 'date-fns'
import { enGB, fr, ro } from 'date-fns/locale'
import type { Locale } from 'date-fns'
import i18n from '@/lib/i18n'

const LOCALES: Record<string, Locale> = { en: enGB, fr, ro }

export function dateLocale(): Locale {
  return LOCALES[i18n.resolvedLanguage ?? 'en'] ?? enGB
}

export function parseDate(value: string) {
  return parseISO(value)
}

export function formatDate(value: string | Date, pattern: string) {
  const date = typeof value === 'string' ? parseISO(value) : value
  return format(date, pattern, { locale: dateLocale() })
}

export function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1)
}

export function formatTime(value: string | null | undefined) {
  if (!value) return ''
  return value.slice(0, 5)
}

export function timeOf(dateTime: string | null | undefined) {
  if (!dateTime) return ''
  return dateTime.slice(11, 16)
}

export function dateOf(dateTime: string) {
  return dateTime.slice(0, 10)
}

export function relativeTime(value: string) {
  return formatDistanceToNowStrict(parseISO(value), { addSuffix: true, locale: dateLocale() })
}

export function formatMoment(value: string) {
  const date = parseISO(value)
  if (isToday(date)) return format(date, 'HH:mm', { locale: dateLocale() })
  if (isYesterday(date)) return `${i18n.t('common.yesterday')} ${format(date, 'HH:mm', { locale: dateLocale() })}`
  return format(date, 'd MMM, HH:mm', { locale: dateLocale() })
}

export function formatFull(value: string) {
  return format(parseISO(value), 'PPp', { locale: dateLocale() })
}

export function daysBetween(from: string, to: string) {
  return differenceInCalendarDays(parseISO(to), parseISO(from))
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index++
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`
}

export function formatPrice(price: number | null | undefined, currency: string | null | undefined) {
  if (price === null || price === undefined) return ''
  if (price === 0) return i18n.t('common.free')
  const fraction = Number.isInteger(price) ? 0 : 2
  const amount = new Intl.NumberFormat(i18n.resolvedLanguage, { minimumFractionDigits: fraction, maximumFractionDigits: fraction }).format(price)
  return currency ? `${amount} ${currency}` : amount
}

export function formatDuration(minutes: number | null | undefined) {
  if (!minutes) return ''
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')}`
}

export function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

export function websiteHost(url: string) {
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
    return host.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function normalizeUrl(url: string) {
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`
}
