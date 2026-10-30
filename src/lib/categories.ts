import {
  BedDouble,
  Bus,
  CarTaxiFront,
  Coffee,
  Landmark,
  MapPin,
  Palette,
  Plane,
  ShoppingBag,
  Sparkles,
  TrainFront,
  TrainFrontTunnel,
  Trees,
  Utensils,
  Wine,
  type LucideIcon,
} from 'lucide-react'
import type { ActivityCategory, EventCategory, TransportType } from '@/lib/types'

interface Meta {
  color: string
  icon: LucideIcon
}

export const EVENT_META: Record<EventCategory, Meta> = {
  ACTIVITY: { color: 'var(--line-activity)', icon: Sparkles },
  MEAL: { color: 'var(--line-meal)', icon: Utensils },
  ACCOMMODATION: { color: 'var(--line-accommodation)', icon: BedDouble },
  FREE_TIME: { color: 'var(--line-free)', icon: Coffee },
  OTHER: { color: 'var(--line-other)', icon: MapPin },
}

export const TRANSPORT_META: Record<TransportType, Meta> = {
  PLANE: { color: 'var(--line-transport)', icon: Plane },
  TRAIN: { color: 'var(--line-transport)', icon: TrainFront },
  BUS: { color: 'var(--line-transport)', icon: Bus },
  METRO: { color: 'var(--line-transport)', icon: TrainFrontTunnel },
  TAXI: { color: 'var(--line-transport)', icon: CarTaxiFront },
}

export const ACTIVITY_META: Record<ActivityCategory, Meta> = {
  SIGHTSEEING: { color: 'var(--line-sightseeing)', icon: Landmark },
  CULTURE: { color: 'var(--line-culture)', icon: Palette },
  FOOD: { color: 'var(--line-food)', icon: Utensils },
  NIGHTLIFE: { color: 'var(--line-nightlife)', icon: Wine },
  NATURE: { color: 'var(--line-nature)', icon: Trees },
  SHOPPING: { color: 'var(--line-shopping)', icon: ShoppingBag },
  OTHER: { color: 'var(--line-other)', icon: MapPin },
}

export function itemMeta(kind: 'EVENT' | 'TRANSPORT', category: string): Meta {
  if (kind === 'TRANSPORT') return TRANSPORT_META[category as TransportType] ?? TRANSPORT_META.TAXI
  return EVENT_META[category as EventCategory] ?? EVENT_META.OTHER
}
