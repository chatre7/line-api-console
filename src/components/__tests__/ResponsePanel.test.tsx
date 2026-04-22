import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ResponsePanel } from '../ResponsePanel'
import type { ProxyRequest, ProxyResponse } from '@/lib/types'

const req: ProxyRequest = {
  method: 'GET',
  url: 'https://api.line.me/v2/bot/info',
  headers: { Authorization: 'Bearer tok' },
  body: '',
}

const res = (overrides: Partial<ProxyResponse> = {}): ProxyResponse => ({
  status: 200,
  body: '{"userId":"U123"}',
  headers: { 'content-type': 'application/json' },
  durationMs: 142,
  ...overrides,
})

beforeEach(() => {
  Object.assign(navigator, { clipboard: { writeText: vi.fn() } })
})

describe('ResponsePanel', () => {
  it('shows empty state when no response', () => {
    render(<ResponsePanel request={null} response={null} />)
    expect(screen.getByText('Response will appear here')).toBeInTheDocument()
  })

  it('shows status code and duration', () => {
    render(<ResponsePanel request={req} response={res()} />)
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('142ms')).toBeInTheDocument()
  })

  it('status badge is green for 2xx', () => {
    render(<ResponsePanel request={req} response={res({ status: 200 })} />)
    const badge = screen.getByText('200')
    expect(badge.className).toContain('green')
  })

  it('status badge is red for 4xx', () => {
    render(<ResponsePanel request={req} response={res({ status: 404 })} />)
    const badge = screen.getByText('404')
    expect(badge.className).toContain('red')
  })

  it('status badge is dark red for 5xx', () => {
    render(<ResponsePanel request={req} response={res({ status: 500 })} />)
    const badge = screen.getByText('500')
    expect(badge.className).toContain('red-200')
  })

  it('shows formatted JSON body by default', () => {
    render(<ResponsePanel request={req} response={res()} />)
    expect(screen.getByText(/"userId": "U123"/)).toBeInTheDocument()
  })

  it('shows raw body when not valid JSON', () => {
    render(<ResponsePanel request={req} response={res({ body: 'plain text' })} />)
    expect(screen.getByText('plain text')).toBeInTheDocument()
  })

  it('shows response headers in headers tab', () => {
    render(<ResponsePanel request={req} response={res()} />)
    fireEvent.click(screen.getByText('Headers'))
    expect(screen.getByText('content-type')).toBeInTheDocument()
    expect(screen.getByText('application/json')).toBeInTheDocument()
  })

  it('shows cURL command in cURL tab', () => {
    render(<ResponsePanel request={req} response={res()} />)
    fireEvent.click(screen.getByText('cURL'))
    expect(screen.getByText(/curl -X GET/)).toBeInTheDocument()
    expect(screen.getByText(/Authorization: Bearer tok/)).toBeInTheDocument()
  })
})
