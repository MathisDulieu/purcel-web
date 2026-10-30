export type Language = 'en' | 'fr' | 'ro'
export type Role = 'ADMIN' | 'MEMBER'
export type EventCategory = 'ACTIVITY' | 'MEAL' | 'ACCOMMODATION' | 'FREE_TIME' | 'OTHER'
export type ActivityCategory = 'SIGHTSEEING' | 'CULTURE' | 'FOOD' | 'NIGHTLIFE' | 'NATURE' | 'SHOPPING' | 'OTHER'
export type TransportType = 'PLANE' | 'TRAIN' | 'BUS' | 'METRO' | 'TAXI'
export type EntityType = 'TRIP' | 'PLANNING_EVENT' | 'ACTIVITY' | 'TRANSPORT' | 'FOLDER' | 'DOCUMENT'
export type ChangeAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'REVERT'

export const EVENT_CATEGORIES: EventCategory[] = ['ACTIVITY', 'MEAL', 'ACCOMMODATION', 'FREE_TIME', 'OTHER']
export const ACTIVITY_CATEGORIES: ActivityCategory[] = ['SIGHTSEEING', 'CULTURE', 'FOOD', 'NIGHTLIFE', 'NATURE', 'SHOPPING', 'OTHER']
export const TRANSPORT_TYPES: TransportType[] = ['PLANE', 'TRAIN', 'BUS', 'METRO', 'TAXI']

export interface Audit {
  version: number
  createdAt: string
  createdBy: string | null
  updatedAt: string
  updatedBy: string | null
}

export interface UserProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  avatar: number
  status: string | null
  role: Role
  language: Language
  createdAt: string
}

export interface UserSummary {
  id: string
  firstName: string
  lastName: string
  avatar: number
  status: string | null
  role: Role
  online: boolean
  lastSeenAt: string | null
}

export interface AdminUser extends UserSummary {
  email: string
  language: Language
  createdAt: string
  credentialsSentAt: string | null
  passwordChangedAt: string | null
}

export interface Trip {
  id: string
  name: string
  destination: string
  startDate: string
  endDate: string
  timezone: string
  description: string | null
  version: number
  updatedAt: string
  updatedBy: string | null
}

export interface PlanningEvent extends Audit {
  id: string
  date: string
  startTime: string | null
  endTime: string | null
  title: string
  category: EventCategory
  description: string | null
  address: string | null
  activityId: string | null
}

export interface Activity extends Audit {
  id: string
  name: string
  category: ActivityCategory
  description: string | null
  address: string | null
  photoIds: string[]
  price: number | null
  currency: string | null
  durationMinutes: number | null
  website: string | null
  openingHours: string | null
  notes: string | null
}

export interface Transport extends Audit {
  id: string
  type: TransportType
  departureLocation: string
  departureAddress: string | null
  departureAt: string
  arrivalLocation: string
  arrivalAddress: string | null
  arrivalAt: string | null
  company: string | null
  referenceNumber: string | null
  seats: string | null
  bookingReference: string | null
  price: number | null
  currency: string | null
  notes: string | null
  documentIds: string[]
}

export interface Folder extends Audit {
  id: string
  name: string
  parentId: string | null
}

export interface DocumentFile extends Audit {
  id: string
  name: string
  description: string | null
  folderId: string | null
  fileId: string
  contentType: string
  size: number
  originalFilename: string
}

export interface DocumentTree {
  folders: Folder[]
  documents: DocumentFile[]
}

export interface SyncSnapshot {
  serverTime: string
  trip: Trip
  events: PlanningEvent[]
  transports: Transport[]
  activities: Activity[]
  documents: DocumentTree
  users: UserSummary[]
}

export interface FieldChange {
  field: string
  before: string | null
  after: string | null
}

export interface ChangeLogEntry {
  id: string
  entityType: EntityType
  entityId: string
  entityLabel: string | null
  action: ChangeAction
  userId: string
  at: string
  changes: FieldChange[]
  revertible: boolean
  revertedAt: string | null
  revertedBy: string | null
  revertOf: string | null
}

export interface ChangeEvent {
  entityType: EntityType
  entityId: string | null
  action: ChangeAction
  userId: string
  at: string
}

export interface StoredFile {
  id: string
  name: string
  contentType: string
  size: number
}

export interface ChatAttachment {
  fileId: string
  contentType: string
  name: string
  size: number
}

export interface ChatReaction {
  emoji: string
  userIds: string[]
}

export interface ChatReplyPreview {
  id: string
  authorId: string | null
  excerpt: string | null
  hasAttachments: boolean
  deleted: boolean
}

export interface ChatMessage {
  id: string
  authorId: string
  text: string | null
  attachments: ChatAttachment[]
  replyTo: ChatReplyPreview | null
  reactions: ChatReaction[]
  createdAt: string
  editedAt: string | null
  deleted: boolean
}

export interface ChatPage {
  messages: ChatMessage[]
  hasMore: boolean
}

export interface ReadState {
  userId: string
  lastReadMessageId: string | null
  lastReadAt: string | null
}

export interface ChatEvent {
  type: 'MESSAGE_CREATED' | 'MESSAGE_UPDATED' | 'MESSAGE_DELETED' | 'READ'
  message: ChatMessage | null
  read: ReadState | null
}

export interface PresenceEvent {
  userId: string
  online: boolean
  lastSeenAt: string | null
}

export interface TypingEvent {
  userId: string
  typing: boolean
}

export interface PlanningItem {
  kind: 'EVENT' | 'TRANSPORT'
  id: string
  date: string
  startTime: string | null
  endTime: string | null
  endDayOffset: number
  title: string
  category: EventCategory | TransportType
  description: string | null
  address: string | null
  event?: PlanningEvent
  transport?: Transport
  activity?: Activity
}

export interface PlanningDay {
  date: string
  dayNumber: number
  withinTrip: boolean
  items: PlanningItem[]
}
