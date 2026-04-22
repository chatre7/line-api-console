import { describe, it, expect, beforeEach } from 'vitest'
import {
  getToken, setToken,
  getChannelSecret, setChannelSecret,
  getHistory, appendHistory, clearHistory,
} from '../storage'
import type { HistoryEntry } from '../types'

const makeEntry = (id: string): HistoryEntry => ({
  id,
  timestamp: Date.now(),
  endpoint: { method: 'GET', path: '/v2/bot/info', summary: 'Get bot info' },
  request: { method: 'GET', url: 'https://api.line.me/v2/bot/info', headers: {}, body: '' },
  response: { status: 200, body: '{}', headers: {}, durationMs: 100 },
})

beforeEach(() => localStorage.clear())

describe('token', () => {
  it('returns null when not set', () => expect(getToken()).toBeNull())
  it('returns value after set', () => {
    setToken('tok')
    expect(getToken()).toBe('tok')
  })
})

describe('channelSecret', () => {
  it('returns null when not set', () => expect(getChannelSecret()).toBeNull())
  it('returns value after set', () => {
    setChannelSecret('sec')
    expect(getChannelSecret()).toBe('sec')
  })
})

describe('history', () => {
  it('returns empty array when empty', () => expect(getHistory()).toEqual([]))
  it('appends entries newest-first', () => {
    appendHistory(makeEntry('1'))
    appendHistory(makeEntry('2'))
    expect(getHistory()).toHaveLength(2)
    expect(getHistory()[0].id).toBe('2')
  })
  it('caps at 50 entries', () => {
    for (let i = 0; i < 55; i++) appendHistory(makeEntry(String(i)))
    expect(getHistory()).toHaveLength(50)
  })
  it('clears history', () => {
    appendHistory(makeEntry('1'))
    clearHistory()
    expect(getHistory()).toEqual([])
  })
  it('returns empty array when localStorage contains invalid JSON', () => {
    localStorage.setItem('lac_history', 'not-json')
    expect(getHistory()).toEqual([])
  })
})
