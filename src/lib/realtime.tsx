import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Client, type IMessage } from '@stomp/stompjs'
import { useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query'
import { getToken, websocketUrl } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { ChatEvent, ChatMessage, ChatPage, PresenceEvent, ReadState, SyncSnapshot, TypingEvent, UserSummary } from '@/lib/types'

interface RealtimeContextValue {
  connected: boolean
  typing: string[]
  sendTyping: (typing: boolean) => void
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null)

function parse<T>(message: IMessage): T | null {
  try {
    return JSON.parse(message.body) as T
  } catch {
    return null
  }
}

export function applyChatMessage(client: QueryClient, message: ChatMessage, mode: 'upsert' | 'replace') {
  client.setQueryData<InfiniteData<ChatPage, string | null>>(['chat'], (data) => {
    if (!data) return data
    let found = false
    const pages = data.pages.map((page) => ({
      ...page,
      messages: page.messages.map((existing) => {
        if (existing.id === message.id) {
          found = true
          return message
        }
        return existing
      }),
    }))
    if (!found && mode === 'upsert' && pages.length > 0) {
      pages[0] = { ...pages[0], messages: [...pages[0].messages, message] }
    }
    return { ...data, pages }
  })
}

function patchUsers(client: QueryClient, patch: (users: UserSummary[]) => UserSummary[]) {
  client.setQueryData<SyncSnapshot>(['sync'], (data) => (data ? { ...data, users: patch(data.users) } : data))
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth()
  const client = useQueryClient()
  const [connected, setConnected] = useState(false)
  const [typingMap, setTypingMap] = useState<Record<string, number>>({})
  const stompRef = useRef<Client | null>(null)
  const changeTimer = useRef<number | undefined>(undefined)
  const userId = user?.id

  useEffect(() => {
    if (!token) return
    const stomp = new Client({
      brokerURL: websocketUrl(),
      connectHeaders: { Authorization: `Bearer ${getToken() ?? ''}` },
      reconnectDelay: 4000,
      heartbeatIncoming: 15000,
      heartbeatOutgoing: 15000,
    })

    const refreshData = () => {
      window.clearTimeout(changeTimer.current)
      changeTimer.current = window.setTimeout(() => {
        void client.invalidateQueries({ queryKey: ['sync'] })
        void client.invalidateQueries({ queryKey: ['history'] })
      }, 250)
    }

    stomp.onConnect = () => {
      setConnected(true)
      refreshData()
      void client.invalidateQueries({ queryKey: ['chat'] })
      void client.invalidateQueries({ queryKey: ['chatUnread'] })
      stomp.subscribe('/topic/changes', () => refreshData())
      stomp.subscribe('/topic/presence', (message) => {
        const event = parse<PresenceEvent>(message)
        if (!event) return
        patchUsers(client, (users) =>
          users.map((entry) =>
            entry.id === event.userId
              ? { ...entry, online: event.online, lastSeenAt: event.lastSeenAt ?? entry.lastSeenAt }
              : entry,
          ),
        )
        void client.invalidateQueries({ queryKey: ['adminUsers'] })
      })
      stomp.subscribe('/topic/users', (message) => {
        const users = parse<UserSummary[]>(message)
        if (users) patchUsers(client, () => users)
        void client.invalidateQueries({ queryKey: ['adminUsers'] })
      })
      stomp.subscribe('/topic/chat', (message) => {
        const event = parse<ChatEvent>(message)
        if (!event) return
        if (event.message) {
          applyChatMessage(client, event.message, event.type === 'MESSAGE_CREATED' ? 'upsert' : 'replace')
          if (event.type === 'MESSAGE_CREATED') {
            setTypingMap((current) => {
              const next = { ...current }
              delete next[event.message!.authorId]
              return next
            })
          }
        }
        if (event.read) {
          const read = event.read
          client.setQueryData<ReadState[]>(['readStates'], (states) => {
            const others = (states ?? []).filter((state) => state.userId !== read.userId)
            return [...others, read]
          })
        }
        void client.invalidateQueries({ queryKey: ['chatUnread'] })
      })
      stomp.subscribe('/topic/chat.typing', (message) => {
        const event = parse<TypingEvent>(message)
        if (!event) return
        setTypingMap((current) => {
          const next = { ...current }
          if (event.typing) next[event.userId] = Date.now()
          else delete next[event.userId]
          return next
        })
      })
    }
    stomp.onWebSocketClose = () => setConnected(false)
    stomp.onStompError = () => setConnected(false)
    stomp.activate()
    stompRef.current = stomp
    return () => {
      window.clearTimeout(changeTimer.current)
      stompRef.current = null
      setConnected(false)
      void stomp.deactivate()
    }
  }, [token, client])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTypingMap((current) => {
        const limit = Date.now() - 6000
        const entries = Object.entries(current).filter(([, at]) => at > limit)
        return entries.length === Object.keys(current).length ? current : Object.fromEntries(entries)
      })
    }, 2000)
    return () => window.clearInterval(interval)
  }, [])

  const sendTyping = useCallback((typing: boolean) => {
    const stomp = stompRef.current
    if (!stomp?.connected) return
    stomp.publish({ destination: '/app/chat.typing', body: JSON.stringify({ typing }) })
  }, [])

  const typing = useMemo(() => Object.keys(typingMap).filter((id) => id !== userId), [typingMap, userId])
  const value = useMemo(() => ({ connected, typing, sendTyping }), [connected, typing, sendTyping])
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (!context) throw new Error('RealtimeProvider missing')
  return context
}
