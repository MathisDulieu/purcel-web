import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { PlanningDay, PlanningItem, SyncSnapshot, UserSummary } from '@/lib/types'

export function useSync() {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['sync'],
    queryFn: () => api<SyncSnapshot>('/api/sync'),
    enabled: token !== null,
    staleTime: 20_000,
    refetchInterval: 5 * 60_000,
  })
}

export function useUsers() {
  const { data } = useSync()
  return data?.users ?? []
}

export function useUserMap() {
  const users = useUsers()
  return useMemo(() => new Map<string, UserSummary>(users.map((user) => [user.id, user])), [users])
}

export function useInvalidateData() {
  const client = useQueryClient()
  return () => {
    void client.invalidateQueries({ queryKey: ['sync'] })
    void client.invalidateQueries({ queryKey: ['history'] })
  }
}

export function useDataMutation<TVariables, TResult = unknown>(fn: (variables: TVariables) => Promise<TResult>) {
  const invalidate = useInvalidateData()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => invalidate(),
  })
}

export function itemTime(item: PlanningItem) {
  return item.startTime ?? ''
}

export function buildDays(snapshot: SyncSnapshot | undefined): PlanningDay[] {
  if (!snapshot) return []
  const { trip, events, transports, activities } = snapshot
  const activityById = new Map(activities.map((activity) => [activity.id, activity]))
  const byDate = new Map<string, PlanningItem[]>()
  const start = parseISO(trip.startDate)
  const end = parseISO(trip.endDate)
  for (let day = start; day <= end; day = addDays(day, 1)) {
    byDate.set(format(day, 'yyyy-MM-dd'), [])
  }
  for (const event of events) {
    const activity = event.activityId ? activityById.get(event.activityId) : undefined
    const overnight = event.startTime && event.endTime && event.endTime < event.startTime ? 1 : 0
    const list = byDate.get(event.date) ?? []
    list.push({
      kind: 'EVENT',
      id: event.id,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      endDayOffset: overnight,
      title: event.title,
      category: event.category,
      description: event.description,
      address: event.address ?? activity?.address ?? null,
      event,
      activity,
    })
    byDate.set(event.date, list)
  }
  for (const transport of transports) {
    const date = transport.departureAt.slice(0, 10)
    const list = byDate.get(date) ?? []
    list.push({
      kind: 'TRANSPORT',
      id: transport.id,
      date,
      startTime: transport.departureAt.slice(11, 19),
      endTime: transport.arrivalAt ? transport.arrivalAt.slice(11, 19) : null,
      endDayOffset: transport.arrivalAt
        ? differenceInCalendarDays(parseISO(transport.arrivalAt.slice(0, 10)), parseISO(date))
        : 0,
      title: `${transport.departureLocation} → ${transport.arrivalLocation}`,
      category: transport.type,
      description: transport.notes,
      address: transport.departureAddress ?? transport.departureLocation,
      transport,
    })
    byDate.set(date, list)
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => {
      const parsed = parseISO(date)
      return {
        date,
        dayNumber: differenceInCalendarDays(parsed, start) + 1,
        withinTrip: parsed >= start && parsed <= end,
        items: items.sort((a, b) => {
          if (!a.startTime && b.startTime) return -1
          if (a.startTime && !b.startTime) return 1
          return (a.startTime ?? '').localeCompare(b.startTime ?? '') || a.title.localeCompare(b.title)
        }),
      }
    })
}

export function usePlanningDays() {
  const { data } = useSync()
  return useMemo(() => buildDays(data), [data])
}
