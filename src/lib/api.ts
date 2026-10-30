export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/$/, '')

const TOKEN_KEY = 'purcel.token'

let currentToken: string | null = readToken()
const unauthorizedListeners = new Set<() => void>()

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getToken() {
  return currentToken
}

export function setToken(token: string | null) {
  currentToken = token
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    return
  }
}

export function onUnauthorized(listener: () => void) {
  unauthorizedListeners.add(listener)
  return () => {
    unauthorizedListeners.delete(listener)
  }
}

export class ApiError extends Error {
  status: number
  code: string
  fields: Record<string, string>

  constructor(status: number, code: string, fields: Record<string, string> = {}) {
    super(code)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

interface RequestOptions {
  method?: string
  json?: unknown
  form?: FormData
  signal?: AbortSignal
  auth?: boolean
}

async function send(path: string, options: RequestOptions = {}): Promise<Response> {
  const headers: Record<string, string> = {}
  if (options.auth !== false && currentToken) headers.Authorization = `Bearer ${currentToken}`
  let body: BodyInit | undefined
  if (options.json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.json)
  } else if (options.form) {
    body = options.form
  }
  let response: Response
  try {
    response = await fetch(API_URL + path, { method: options.method ?? 'GET', headers, body, signal: options.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'NETWORK')
  }
  if (!response.ok) {
    let code = 'UNKNOWN'
    let fields: Record<string, string> = {}
    try {
      const problem = await response.json()
      code = problem.code ?? code
      fields = problem.fields ?? {}
    } catch {
      code = response.status === 413 ? 'FILE_TOO_LARGE' : code
    }
    if (response.status === 401 && options.auth !== false) {
      unauthorizedListeners.forEach((listener) => listener())
    }
    throw new ApiError(response.status, code, fields)
  }
  return response
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options)
  if (response.status === 204) return undefined as T
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export async function apiBlob(path: string, signal?: AbortSignal): Promise<Blob> {
  const response = await send(path, { signal })
  return response.blob()
}

export function fileUrl(fileId: string) {
  return `${API_URL}/api/files/${fileId}?access_token=${encodeURIComponent(currentToken ?? '')}`
}

export function documentUrl(documentId: string, download = false) {
  const query = new URLSearchParams({ access_token: currentToken ?? '' })
  if (download) query.set('download', 'true')
  return `${API_URL}/api/documents/${documentId}/content?${query.toString()}`
}

export function exportUrl(language: string) {
  return `${API_URL}/api/export/planning.xlsx?lang=${language}&access_token=${encodeURIComponent(currentToken ?? '')}`
}

export function websocketUrl() {
  return API_URL.replace(/^http/, 'ws') + '/ws'
}
