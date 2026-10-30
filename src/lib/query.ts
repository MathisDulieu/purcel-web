import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { ApiError } from '@/lib/api'

const PERSISTED_KEYS = new Set(['sync', 'me', 'chat', 'readStates'])

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24 * 30,
      networkMode: 'offlineFirst',
      refetchOnWindowFocus: true,
      retry: (count, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
        return count < 2
      },
    },
    mutations: {
      networkMode: 'online',
      retry: false,
    },
  },
})

export const persister = createSyncStoragePersister({
  storage: typeof window === 'undefined' ? undefined : window.localStorage,
  key: 'purcel.cache',
  throttleTime: 1500,
})

export const persistOptions = {
  persister,
  maxAge: 1000 * 60 * 60 * 24 * 30,
  buster: 'purcel-v1',
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { queryKey: readonly unknown[]; state: { status: string } }) =>
      PERSISTED_KEYS.has(String(query.queryKey[0])) && query.state.status === 'success',
  },
}
