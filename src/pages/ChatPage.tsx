import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Camera, CornerDownRight, ImagePlus, Pencil, Reply, SendHorizontal, Smile, SmilePlus, Trash2, X } from 'lucide-react'
import clsx from 'clsx'
import { isSameDay, parseISO } from 'date-fns'
import { api, fileUrl } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useUserMap, useUsers } from '@/lib/data'
import { capitalize, formatDate, formatMoment, relativeTime } from '@/lib/format'
import { useOnline } from '@/lib/online'
import { applyChatMessage, useRealtime } from '@/lib/realtime'
import type { ChatMessage, ChatPage as ChatPageData, ReadState, UserSummary } from '@/lib/types'
import { PigAvatar } from '@/components/PigAvatar'
import { Popover } from '@/components/Popover'
import { Lightbox } from '@/components/Lightbox'
import { Sheet } from '@/components/Sheet'
import { Button, IconButton, Spinner } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { uploadImage } from '@/components/PhotoField'
import { EmojiPanel, QUICK_REACTIONS } from '@/components/chat/EmojiPanel'

const PAGE_SIZE = 40
const GROUP_GAP = 5 * 60 * 1000

function useChatMessages() {
  const { token } = useAuth()
  return useInfiniteQuery({
    queryKey: ['chat'],
    queryFn: ({ pageParam }) => api<ChatPageData>(`/api/chat/messages?limit=${PAGE_SIZE}${pageParam ? `&before=${pageParam}` : ''}`),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore && last.messages.length > 0 ? last.messages[0].id : undefined),
    enabled: token !== null,
    staleTime: 10_000,
  })
}

function useReadStates() {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['readStates'],
    queryFn: () => api<ReadState[]>('/api/chat/read-states'),
    enabled: token !== null,
  })
}

interface PendingImage {
  key: string
  file: File
  preview: string
}

function MemberList({ users, meId }: { users: UserSummary[]; meId?: string }) {
  const { t } = useTranslation()
  const sorted = [...users].sort((a, b) => Number(b.online) - Number(a.online) || a.firstName.localeCompare(b.firstName))
  return (
    <ul className="flex flex-col gap-1">
      {sorted.map((user) => (
        <li key={user.id} className="flex items-center gap-3 rounded-2xl px-2 py-2">
          <PigAvatar avatar={user.avatar} size={40} online={user.online} />
          <span className="min-w-0">
            <span className="block truncate font-semibold">
              {user.firstName} {user.lastName}
              {user.id === meId ? <span className="font-normal text-ink-soft"> ({t('chat.you')})</span> : null}
            </span>
            <span className={clsx('block truncate text-xs', user.online ? 'font-semibold text-pine' : 'text-ink-soft')}>
              {user.online ? t('chat.online') : user.lastSeenAt ? t('chat.lastSeen', { when: relativeTime(user.lastSeenAt) }) : t('chat.neverSeen')}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

function TypingIndicator({ names }: { names: string[] }) {
  const { t } = useTranslation()
  return (
    <AnimatePresence>
      {names.length > 0 ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="flex items-center gap-2 px-4 pb-1 text-xs font-semibold text-ink-soft">
          <span className="flex gap-0.5" aria-hidden="true">
            {[0, 1, 2].map((dot) => (
              <motion.span
                key={dot}
                className="size-1.5 rounded-full bg-ink-soft"
                animate={{ y: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 0.9, delay: dot * 0.15 }}
              />
            ))}
          </span>
          {t('chat.typing', { count: names.length, names: names.join(', ') })}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

interface BubbleProps {
  message: ChatMessage
  mine: boolean
  firstOfGroup: boolean
  author?: UserSummary
  readers: UserSummary[]
  users: Map<string, UserSummary>
  meId: string
  isAdmin: boolean
  online: boolean
  onReply: () => void
  onEdit: () => void
  onDelete: () => void
  onReact: (emoji: string) => void
  onOpenImage: (urls: string[], index: number) => void
  onLongPress: () => void
}

function Bubble({ message, mine, firstOfGroup, author, readers, users, meId, isAdmin, online, onReply, onEdit, onDelete, onReact, onOpenImage, onLongPress }: BubbleProps) {
  const { t } = useTranslation()
  const [picker, setPicker] = useState(false)
  const pressTimer = useRef<number | undefined>(undefined)
  const images = message.attachments.map((attachment) => fileUrl(attachment.fileId))
  const replyAuthor = message.replyTo?.authorId ? users.get(message.replyTo.authorId) : undefined

  const startPress = () => {
    window.clearTimeout(pressTimer.current)
    pressTimer.current = window.setTimeout(onLongPress, 450)
  }
  const cancelPress = () => window.clearTimeout(pressTimer.current)

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className={clsx('group flex gap-2.5 px-3 sm:px-5', mine ? 'flex-row-reverse' : 'flex-row', firstOfGroup ? 'mt-3' : 'mt-0.5')}
    >
      <div className="w-9 shrink-0">{!mine && firstOfGroup && author ? <PigAvatar avatar={author.avatar} size={36} /> : null}</div>
      <div className={clsx('flex max-w-[min(34rem,80%)] min-w-0 flex-col', mine ? 'items-end' : 'items-start')}>
        {firstOfGroup ? (
          <span className={clsx('mb-1 flex items-baseline gap-2 px-1 text-xs', mine ? 'flex-row-reverse' : '')}>
            {!mine ? <span className="font-bold">{author?.firstName ?? '?'}</span> : null}
            <span className="text-ink-faint tabular">{formatMoment(message.createdAt)}</span>
          </span>
        ) : null}
        <div className={clsx('flex items-center gap-1', mine ? 'flex-row-reverse' : '')}>
          <div
            onPointerDown={(event) => event.pointerType === 'touch' && !message.deleted && startPress()}
            onPointerUp={cancelPress}
            onPointerLeave={cancelPress}
            onPointerCancel={cancelPress}
            onContextMenu={(event) => {
              if (!message.deleted && window.matchMedia('(pointer: coarse)').matches) {
                event.preventDefault()
                onLongPress()
              }
            }}
            className={clsx(
              'min-w-0 overflow-hidden rounded-[1.35rem] text-[0.97rem] leading-snug [overflow-wrap:anywhere] select-text',
              message.deleted
                ? 'border border-dashed border-line px-4 py-2 text-sm text-ink-faint italic'
                : !message.text && !message.replyTo
                  ? 'bg-transparent'
                  : mine
                  ? 'bg-cobalt text-on-cobalt'
                  : 'bg-surface text-ink shadow-card',
              mine && !message.deleted && (firstOfGroup ? 'rounded-tr-md' : 'rounded-r-md'),
              !mine && !message.deleted && (firstOfGroup ? 'rounded-tl-md' : 'rounded-l-md'),
            )}
          >
            {message.deleted ? (
              t('chat.deleted')
            ) : (
              <>
                {message.replyTo ? (
                  <div className={clsx('mx-2 mt-2 rounded-xl border-l-[3px] px-3 py-1.5 text-sm', mine ? 'border-on-cobalt/60 bg-black/15' : 'border-cobalt bg-surface-2')}>
                    <p className="text-xs font-bold">{replyAuthor?.firstName ?? '?'}</p>
                    <p className="line-clamp-2 opacity-85">
                      {message.replyTo.deleted ? t('chat.deleted') : message.replyTo.excerpt || (message.replyTo.hasAttachments ? t('chat.photo') : '')}
                    </p>
                  </div>
                ) : null}
                {images.length > 0 ? (
                  <div className={clsx('grid gap-1', message.text || message.replyTo ? 'p-1' : 'p-0', images.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
                    {images.map((url, index) => (
                      <button key={url} type="button" onClick={() => onOpenImage(images, index)} className="overflow-hidden rounded-[1.1rem]">
                        <img src={url} alt="" loading="lazy" className={clsx('w-full object-cover', images.length > 1 ? 'aspect-square' : 'max-h-80')} />
                      </button>
                    ))}
                  </div>
                ) : null}
                {message.text ? <p className="px-4 py-2.5 whitespace-pre-wrap">{message.text}</p> : null}
                {message.editedAt ? <p className={clsx('-mt-2 px-4 pb-2 text-[0.7rem]', mine ? 'text-on-cobalt/70' : 'text-ink-faint')}>{t('chat.edited')}</p> : null}
              </>
            )}
          </div>
          {!message.deleted && online ? (
            <div className={clsx('hidden shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(pointer:fine)]:flex', mine ? 'flex-row-reverse' : '')}>
              <Popover
                open={picker}
                onClose={() => setPicker(false)}
                align={mine ? 'right' : 'left'}
                anchor={<IconButton icon={SmilePlus} label={t('chat.react')} size="sm" onClick={() => setPicker((value) => !value)} />}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex gap-1 rounded-full border border-line bg-surface p-1 shadow-card">
                    {QUICK_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          onReact(emoji)
                          setPicker(false)
                        }}
                        className="grid size-9 place-items-center rounded-full text-xl transition-transform hover:scale-125 hover:bg-surface-2"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <EmojiPanel
                    onSelect={(emoji) => {
                      onReact(emoji)
                      setPicker(false)
                    }}
                  />
                </div>
              </Popover>
              <IconButton icon={Reply} label={t('chat.reply')} size="sm" onClick={onReply} />
              {mine && message.text !== null ? <IconButton icon={Pencil} label={t('common.edit')} size="sm" onClick={onEdit} /> : null}
              {mine || isAdmin ? <IconButton icon={Trash2} label={t('common.delete')} size="sm" tone="danger" onClick={onDelete} /> : null}
            </div>
          ) : null}
        </div>
        {message.reactions.length > 0 ? (
          <div className={clsx('-mt-1.5 flex flex-wrap gap-1 px-2', mine ? 'justify-end' : '')}>
            {message.reactions.map((reaction) => {
              const reacted = reaction.userIds.includes(meId)
              const names = reaction.userIds.map((id) => users.get(id)?.firstName ?? '?').join(', ')
              return (
                <motion.button
                  key={reaction.emoji}
                  type="button"
                  layout
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  onClick={() => online && onReact(reaction.emoji)}
                  title={names}
                  className={clsx(
                    'relative inline-flex h-7 items-center gap-1 rounded-full border-2 px-2 text-sm font-bold tabular',
                    reacted ? 'border-cobalt bg-cobalt-soft text-ink' : 'border-bg bg-surface-2 text-ink-soft',
                  )}
                >
                  <span className="text-base leading-none">{reaction.emoji}</span>
                  {reaction.userIds.length}
                </motion.button>
              )
            })}
          </div>
        ) : null}
        {readers.length > 0 ? (
          <div className={clsx('mt-1 flex -space-x-1.5 px-1', mine ? 'justify-end' : '')} title={t('chat.seenBy', { names: readers.map((reader) => reader.firstName).join(', ') })}>
            {readers.map((reader) => (
              <motion.span key={reader.id} layoutId={`read-${reader.id}`} transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
                <PigAvatar avatar={reader.avatar} size={16} ring />
              </motion.span>
            ))}
          </div>
        ) : null}
      </div>
    </motion.div>
  )
}

export function ChatPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const client = useQueryClient()
  const online = useOnline()
  const { user, isAdmin } = useAuth()
  const users = useUsers()
  const userMap = useUserMap()
  const { typing, sendTyping, connected } = useRealtime()
  const messagesQuery = useChatMessages()
  const readStates = useReadStates()
  const scroller = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const topSentinel = useRef<HTMLDivElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const restoreHeight = useRef<number | null>(null)
  const stickToBottom = useRef(true)
  const lastTyping = useRef(0)
  const [text, setText] = useState('')
  const [images, setImages] = useState<PendingImage[]>([])
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [editing, setEditing] = useState<ChatMessage | null>(null)
  const [sending, setSending] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number | null }>({ urls: [], index: null })
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null)

  const messages = useMemo(() => [...(messagesQuery.data?.pages ?? [])].reverse().flatMap((page) => page.messages), [messagesQuery.data])
  const meId = user?.id ?? ''
  const lastMessage = messages[messages.length - 1]

  const readersByMessage = useMemo(() => {
    const map = new Map<string, UserSummary[]>()
    for (const state of readStates.data ?? []) {
      if (state.userId === meId || !state.lastReadMessageId) continue
      const reader = userMap.get(state.userId)
      if (!reader) continue
      let target = state.lastReadMessageId
      if (!messages.some((message) => message.id === target)) {
        const candidates = messages.filter((message) => message.id <= target)
        if (candidates.length === 0) continue
        target = candidates[candidates.length - 1].id
      }
      map.set(target, [...(map.get(target) ?? []), reader])
    }
    return map
  }, [readStates.data, userMap, messages, meId])

  const typingNames = typing.map((id) => userMap.get(id)?.firstName).filter((name): name is string => Boolean(name))

  const scrollToBottom = useCallback((smooth: boolean) => {
    const element = scroller.current
    if (!element) return
    element.scrollTo({ top: element.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  useLayoutEffect(() => {
    const element = scroller.current
    if (!element) return
    if (restoreHeight.current !== null) {
      element.scrollTop += element.scrollHeight - restoreHeight.current
      restoreHeight.current = null
      return
    }
    if (stickToBottom.current) scrollToBottom(false)
  }, [messages.length, scrollToBottom])

  useEffect(() => {
    if (stickToBottom.current) scrollToBottom(true)
  }, [typingNames.length, scrollToBottom])

  useEffect(() => {
    const element = content.current
    if (!element) return
    const observer = new ResizeObserver(() => {
      if (stickToBottom.current && restoreHeight.current === null) scrollToBottom(false)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [scrollToBottom])

  useEffect(() => {
    const sentinel = topSentinel.current
    const root = scroller.current
    if (!sentinel || !root) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage) {
          restoreHeight.current = root.scrollHeight
          void messagesQuery.fetchNextPage()
        }
      },
      { root, rootMargin: '200px 0px 0px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [messagesQuery])

  useEffect(() => {
    if (!lastMessage || !meId || !online || document.visibilityState !== 'visible') return
    const mine = readStates.data?.find((state) => state.userId === meId)
    if (mine?.lastReadMessageId && mine.lastReadMessageId >= lastMessage.id) return
    const timer = window.setTimeout(() => {
      void api<ReadState>('/api/chat/read', { method: 'POST', json: { messageId: lastMessage.id } })
        .then((state) => {
          client.setQueryData<ReadState[]>(['readStates'], (current) => [...(current ?? []).filter((entry) => entry.userId !== state.userId), state])
          void client.invalidateQueries({ queryKey: ['chatUnread'] })
        })
        .catch(() => undefined)
    }, 600)
    return () => window.clearTimeout(timer)
  }, [lastMessage, meId, online, readStates.data, client])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void client.invalidateQueries({ queryKey: ['readStates'] })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [client])

  useEffect(() => () => images.forEach((image) => URL.revokeObjectURL(image.preview)), [images])

  const autosize = () => {
    const element = textarea.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 180)}px`
  }

  useEffect(autosize, [text])

  const onTextChange = (value: string) => {
    setText(value)
    const now = Date.now()
    if (value && now - lastTyping.current > 2500) {
      lastTyping.current = now
      sendTyping(true)
    }
    if (!value) {
      lastTyping.current = 0
      sendTyping(false)
    }
  }

  const addImages = (files: FileList | null) => {
    if (!files) return
    const added = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, 10 - images.length)
      .map((file, index) => ({ key: `${Date.now()}-${index}-${file.name}`, file, preview: URL.createObjectURL(file) }))
    setImages((current) => [...current, ...added])
  }

  const resetComposer = () => {
    setText('')
    setImages([])
    setReplyTo(null)
    setEditing(null)
    lastTyping.current = 0
    sendTyping(false)
  }

  const submit = async () => {
    const value = text.trim()
    if (sending || (!value && images.length === 0)) return
    setSending(true)
    stickToBottom.current = true
    try {
      if (editing) {
        if (value) {
          const updated = await api<ChatMessage>(`/api/chat/messages/${editing.id}`, { method: 'PUT', json: { text: value } })
          applyChatMessage(client, updated, 'replace')
        }
      } else {
        const uploaded: string[] = []
        for (const image of images) {
          const stored = await uploadImage(image.file, 'chat')
          uploaded.push(stored.id)
        }
        const created = await api<ChatMessage>('/api/chat/messages', {
          method: 'POST',
          json: { text: value || null, attachmentFileIds: uploaded, replyToId: replyTo?.id ?? null },
        })
        applyChatMessage(client, created, 'upsert')
      }
      resetComposer()
      requestAnimationFrame(() => scrollToBottom(true))
      textarea.current?.focus()
    } catch (error) {
      toast.error(error)
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    const coarse = window.matchMedia('(pointer: coarse)').matches
    if (event.key === 'Enter' && !event.shiftKey && !coarse && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void submit()
    }
    if (event.key === 'Escape' && (editing || replyTo)) {
      event.preventDefault()
      resetComposer()
    }
  }

  const react = async (message: ChatMessage, emoji: string) => {
    try {
      const updated = await api<ChatMessage>(`/api/chat/messages/${message.id}/reactions`, { method: 'POST', json: { emoji } })
      applyChatMessage(client, updated, 'replace')
    } catch (error) {
      toast.error(error)
    }
  }

  const remove = async (message: ChatMessage) => {
    try {
      const updated = await api<ChatMessage>(`/api/chat/messages/${message.id}`, { method: 'DELETE' })
      applyChatMessage(client, updated, 'replace')
      setDeleteTarget(null)
    } catch (error) {
      toast.error(error)
    }
  }

  const startEdit = (message: ChatMessage) => {
    setEditing(message)
    setReplyTo(null)
    setImages([])
    setText(message.text ?? '')
    requestAnimationFrame(() => textarea.current?.focus())
  }

  const startReply = (message: ChatMessage) => {
    setReplyTo(message)
    setEditing(null)
    requestAnimationFrame(() => textarea.current?.focus())
  }

  const onlineCount = users.filter((entry) => entry.online).length

  return (
    <div className="flex h-[calc(100dvh-4.6rem-env(safe-area-inset-bottom))] min-h-0 lg:h-dvh">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-6 lg:py-5">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-4xl leading-none font-black tracking-tight sm:text-5xl">{t('chat.title')}</h1>
            <p className="mt-1 text-sm text-ink-soft">
              {connected ? t('chat.onlineCount', { count: onlineCount }) : online ? t('chat.connecting') : t('chat.offline')}
            </p>
          </div>
          <button type="button" onClick={() => setMembersOpen(true)} className="flex -space-x-2.5 xl:hidden" aria-label={t('chat.members')}>
            {users.slice(0, 6).map((entry) => (
              <PigAvatar key={entry.id} avatar={entry.avatar} size={34} ring online={entry.online} />
            ))}
          </button>
        </header>

        <div
          ref={scroller}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3"
          onScroll={(event) => {
            const element = event.currentTarget
            stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120
          }}
        >
          <div ref={content} className="min-h-full">
          <div ref={topSentinel} />
          {messagesQuery.isFetchingNextPage ? (
            <div className="flex justify-center py-3">
              <Spinner className="size-5" />
            </div>
          ) : null}
          {messagesQuery.isPending && !messagesQuery.data ? (
            <div className="grid min-h-[50dvh] place-items-center">
              <Spinner />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex min-h-[55dvh] flex-col items-center justify-center px-6 text-center">
              <PigAvatar avatar={user?.avatar ?? 1} size={88} />
              <p className="mt-4 font-display text-3xl font-extrabold">{t('chat.emptyTitle')}</p>
              <p className="mt-1 max-w-xs text-ink-soft">{t('chat.emptyText')}</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const previous = messages[index - 1]
              const newDay = !previous || !isSameDay(parseISO(previous.createdAt), parseISO(message.createdAt))
              const firstOfGroup =
                newDay ||
                !previous ||
                previous.authorId !== message.authorId ||
                new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() > GROUP_GAP
              return (
                <div key={message.id}>
                  {newDay ? (
                    <div className="sticky top-0 z-10 flex justify-center py-2">
                      <span className="rounded-full bg-surface-2/90 px-3 py-1 text-xs font-semibold text-ink-soft backdrop-blur">
                        {capitalize(formatDate(message.createdAt, 'EEEE d MMMM'))}
                      </span>
                    </div>
                  ) : null}
                  <Bubble
                    message={message}
                    mine={message.authorId === meId}
                    firstOfGroup={firstOfGroup}
                    author={userMap.get(message.authorId)}
                    readers={readersByMessage.get(message.id) ?? []}
                    users={userMap}
                    meId={meId}
                    isAdmin={isAdmin}
                    online={online}
                    onReply={() => startReply(message)}
                    onEdit={() => startEdit(message)}
                    onDelete={() => setDeleteTarget(message)}
                    onReact={(emoji) => void react(message, emoji)}
                    onOpenImage={(urls, imageIndex) => setLightbox({ urls, index: imageIndex })}
                    onLongPress={() => setActionMessage(message)}
                  />
                </div>
              )
            })
          )}
          </div>
        </div>

        <TypingIndicator names={typingNames} />

        <div className="border-t border-line bg-bg px-3 pt-2 pb-3 sm:px-5">
          <AnimatePresence>
            {replyTo || editing ? (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mb-2 flex items-center gap-2 rounded-2xl bg-surface-2 py-2 pr-1 pl-3 text-sm">
                  {editing ? <Pencil className="size-4 shrink-0 text-cobalt" /> : <CornerDownRight className="size-4 shrink-0 text-cobalt" />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-cobalt">
                      {editing ? t('chat.editing') : t('chat.replyingTo', { name: userMap.get(replyTo!.authorId)?.firstName ?? '?' })}
                    </span>
                    <span className="block truncate text-ink-soft">{(editing ?? replyTo)?.text || t('chat.photo')}</span>
                  </span>
                  <IconButton icon={X} label={t('common.cancel')} size="sm" onClick={resetComposer} />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          {images.length > 0 ? (
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {images.map((image) => (
                <div key={image.key} className="relative size-20 shrink-0 overflow-hidden rounded-2xl">
                  <img src={image.preview} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((current) => current.filter((entry) => entry.key !== image.key))}
                    className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-ink/80 text-bg"
                    aria-label={t('common.remove')}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex items-end gap-1.5">
            {!editing ? (
              <>
                <IconButton icon={ImagePlus} label={t('chat.addPhoto')} onClick={() => fileInput.current?.click()} disabled={!online} />
                <IconButton icon={Camera} label={t('chat.takePhoto')} onClick={() => cameraInput.current?.click()} disabled={!online} />
              </>
            ) : null}
            <div className="relative flex min-w-0 flex-1 items-end rounded-[1.4rem] border-[1.5px] border-line bg-surface focus-within:border-cobalt">
              <textarea
                ref={textarea}
                value={text}
                rows={1}
                maxLength={4000}
                onChange={(event) => onTextChange(event.target.value)}
                onKeyDown={onKeyDown}
                onBlur={() => sendTyping(false)}
                placeholder={online ? t('chat.placeholder') : t('chat.offline')}
                disabled={!online}
                aria-label={t('chat.placeholder')}
                className="max-h-44 min-h-11 flex-1 resize-none bg-transparent py-2.5 pl-4 leading-snug outline-none placeholder:text-ink-faint"
              />
              <Popover
                open={emojiOpen}
                onClose={() => setEmojiOpen(false)}
                className="shrink-0"
                anchor={<IconButton icon={Smile} label={t('chat.emoji')} onClick={() => setEmojiOpen((value) => !value)} disabled={!online} />}
              >
                <EmojiPanel
                  onSelect={(emoji) => {
                    const element = textarea.current
                    if (element) {
                      const start = element.selectionStart ?? text.length
                      const end = element.selectionEnd ?? text.length
                      const next = text.slice(0, start) + emoji + text.slice(end)
                      onTextChange(next)
                      requestAnimationFrame(() => {
                        element.focus()
                        element.setSelectionRange(start + emoji.length, start + emoji.length)
                      })
                    } else {
                      onTextChange(text + emoji)
                    }
                  }}
                />
              </Popover>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => void submit()}
              disabled={!online || sending || (!text.trim() && images.length === 0)}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-cobalt text-on-cobalt transition-opacity disabled:opacity-40"
              aria-label={editing ? t('common.save') : t('chat.send')}
            >
              {sending ? <Spinner className="size-5 text-on-cobalt" /> : <SendHorizontal className="size-5" />}
            </motion.button>
          </div>
          <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(event) => { addImages(event.target.files); event.target.value = '' }} />
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(event) => { addImages(event.target.files); event.target.value = '' }} />
        </div>
      </div>

      <aside className="hidden w-72 shrink-0 flex-col border-l border-line px-3 py-5 xl:flex">
        <h2 className="mb-3 px-2 font-display text-2xl font-extrabold">{t('chat.members')}</h2>
        <MemberList users={users} meId={meId} />
      </aside>

      <Sheet open={membersOpen} onClose={() => setMembersOpen(false)} title={t('chat.members')} size="sm">
        <MemberList users={users} meId={meId} />
      </Sheet>

      <Sheet open={actionMessage !== null} onClose={() => setActionMessage(null)} title={t('chat.actions')} size="sm">
        {actionMessage ? (
          <div className="flex flex-col gap-3">
            <div className="flex justify-between rounded-full bg-surface-2 p-1">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    void react(actionMessage, emoji)
                    setActionMessage(null)
                  }}
                  className="grid size-11 place-items-center rounded-full text-2xl active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button type="button" className="flex h-12 items-center gap-3 rounded-2xl px-3 font-semibold hover:bg-surface-2" onClick={() => { startReply(actionMessage); setActionMessage(null) }}>
              <Reply className="size-5" /> {t('chat.reply')}
            </button>
            {actionMessage.authorId === meId && actionMessage.text !== null ? (
              <button type="button" className="flex h-12 items-center gap-3 rounded-2xl px-3 font-semibold hover:bg-surface-2" onClick={() => { startEdit(actionMessage); setActionMessage(null) }}>
                <Pencil className="size-5" /> {t('common.edit')}
              </button>
            ) : null}
            {actionMessage.authorId === meId || isAdmin ? (
              <button type="button" className="flex h-12 items-center gap-3 rounded-2xl px-3 font-semibold text-poppy hover:bg-poppy-soft" onClick={() => { setDeleteTarget(actionMessage); setActionMessage(null) }}>
                <Trash2 className="size-5" /> {t('common.delete')}
              </button>
            ) : null}
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t('chat.deleteTitle')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={() => deleteTarget && void remove(deleteTarget)} data-autofocus>
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-ink-soft">{t('chat.deleteText')}</p>
        {deleteTarget?.text ? <p className="mt-3 rounded-2xl bg-surface-2 px-4 py-3">{deleteTarget.text}</p> : null}
      </Sheet>

      <Lightbox images={lightbox.urls} index={lightbox.index} onIndex={(index) => setLightbox((current) => ({ ...current, index }))} downloadUrl={(index) => `${lightbox.urls[index]}&download=true`} />
    </div>
  )
}

