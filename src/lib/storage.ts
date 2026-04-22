import type { HistoryEntry } from './types'

const KEYS = {
  token: 'lac_token',
  secret: 'lac_secret',
  history: 'lac_history',
} as const

export function getToken(): string | null {
  return localStorage.getItem(KEYS.token)
}

export function setToken(token: string): void {
  localStorage.setItem(KEYS.token, token)
}

export function getChannelSecret(): string | null {
  return localStorage.getItem(KEYS.secret)
}

export function setChannelSecret(secret: string): void {
  localStorage.setItem(KEYS.secret, secret)
}

export function getHistory(): HistoryEntry[] {
  const raw = localStorage.getItem(KEYS.history)
  if (!raw) return []
  try {
    return JSON.parse(raw) as HistoryEntry[]
  } catch {
    return []
  }
}

export function appendHistory(entry: HistoryEntry): void {
  const history = [entry, ...getHistory()].slice(0, 50)
  localStorage.setItem(KEYS.history, JSON.stringify(history))
}

export function clearHistory(): void {
  localStorage.removeItem(KEYS.history)
}
