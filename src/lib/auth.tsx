import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, getToken, onUnauthorized, setToken } from '@/lib/api'
import i18n from '@/lib/i18n'
import { persister, queryClient } from '@/lib/query'
import type { Language, UserProfile } from '@/lib/types'

interface AuthContextValue {
  token: string | null
  user: UserProfile | undefined
  isAdmin: boolean
  login: (email: string, password: string) => Promise<UserProfile>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken())

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => api<UserProfile>('/api/me'),
    enabled: token !== null,
    staleTime: 60_000,
  })

  const clearSession = useCallback(async () => {
    setToken(null)
    setTokenState(null)
    queryClient.clear()
    await persister.removeClient()
  }, [])

  useEffect(() => onUnauthorized(() => void clearSession()), [clearSession])

  const login = useCallback(async (email: string, password: string) => {
    const response = await api<{ token: string; user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      json: { email, password },
      auth: false,
    })
    setToken(response.token)
    queryClient.setQueryData(['me'], response.user)
    setTokenState(response.token)
    const language = (i18n.resolvedLanguage ?? 'en') as Language
    if (response.user.language !== language) {
      void api<UserProfile>('/api/me/language', { method: 'PUT', json: { language } })
        .then((user) => queryClient.setQueryData(['me'], user))
        .catch(() => undefined)
    }
    return response.user
  }, [])

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    await clearSession()
  }, [clearSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user: meQuery.data,
      isAdmin: meQuery.data?.role === 'ADMIN',
      login,
      logout,
    }),
    [token, meQuery.data, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider missing')
  return context
}
