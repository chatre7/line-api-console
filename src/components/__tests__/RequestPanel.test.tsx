import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { RequestPanel } from '../RequestPanel'
import type { Endpoint } from '@/lib/types'

const ep = (overrides: Partial<Endpoint> = {}): Endpoint => ({
  id: 'GET:/v2/bot/info',
  method: 'GET',
  path: '/v2/bot/info',
  summary: 'Get bot info',
  tag: 'Bot',
  parameters: [],
  ...overrides,
})

const defaults = {
  endpoint: null as Endpoint | null,
  onResponse: vi.fn(),
  onOpenSettings: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('RequestPanel', () => {
  it('shows empty state when no endpoint selected', () => {
    render(<RequestPanel {...defaults} endpoint={null} />)
    expect(screen.getByText('Select an endpoint from the sidebar')).toBeInTheDocument()
  })

  it('shows method badge and resolved URL', () => {
    render(<RequestPanel {...defaults} endpoint={ep()} />)
    expect(screen.getByText('GET')).toBeInTheDocument()
    expect(screen.getByText('https://api.line.me/v2/bot/info')).toBeInTheDocument()
  })

  it('shows warning banner when no token saved', () => {
    render(<RequestPanel {...defaults} endpoint={ep()} />)
    expect(screen.getByText(/No Channel Access Token saved/)).toBeInTheDocument()
  })

  it('hides warning banner when token is saved', () => {
    localStorage.setItem('lac_token', 'my-token')
    render(<RequestPanel {...defaults} endpoint={ep()} />)
    expect(screen.queryByText(/No Channel Access Token saved/)).not.toBeInTheDocument()
  })

  it('calls onOpenSettings when Settings link in warning banner is clicked', () => {
    render(<RequestPanel {...defaults} endpoint={ep()} />)
    fireEvent.click(screen.getByText('Open Settings'))
    expect(defaults.onOpenSettings).toHaveBeenCalled()
  })

  it('renders path param inputs for path parameters', () => {
    const endpoint = ep({
      id: 'GET:/v2/bot/message/{messageId}/content',
      path: '/v2/bot/message/{messageId}/content',
      parameters: [{ name: 'messageId', in: 'path', required: true }],
    })
    render(<RequestPanel {...defaults} endpoint={endpoint} />)
    expect(screen.getByPlaceholderText('messageId')).toBeInTheDocument()
  })

  it('substitutes path param into resolved URL', () => {
    const endpoint = ep({
      id: 'GET:/v2/bot/message/{messageId}/content',
      path: '/v2/bot/message/{messageId}/content',
      parameters: [{ name: 'messageId', in: 'path', required: true }],
    })
    render(<RequestPanel {...defaults} endpoint={endpoint} />)
    fireEvent.change(screen.getByPlaceholderText('messageId'), { target: { value: 'abc123' } })
    expect(screen.getByText('https://api.line.me/v2/bot/message/abc123/content')).toBeInTheDocument()
  })

  it('shows body section only when endpoint has requestBody', () => {
    render(<RequestPanel {...defaults} endpoint={ep()} />)
    expect(screen.queryByText(/Body/)).not.toBeInTheDocument()

    const endpointWithBody = ep({
      id: 'POST:/v2/bot/message/push',
      method: 'POST',
      requestBody: { required: true, contentType: 'application/json' },
    })
    render(<RequestPanel {...defaults} endpoint={endpointWithBody} />)
    expect(screen.getByText(/Body \(application\/json\)/)).toBeInTheDocument()
  })

  it('prettifies valid JSON in body', () => {
    const endpoint = ep({
      id: 'POST:/v2/bot/message/push',
      method: 'POST',
      requestBody: { required: true, contentType: 'application/json' },
    })
    render(<RequestPanel {...defaults} endpoint={endpoint} />)
    const textarea = screen.getByPlaceholderText('{ ... JSON ... }')
    fireEvent.change(textarea, { target: { value: '{"to":"uid","messages":[]}' } })
    fireEvent.click(screen.getByText('Prettify JSON'))
    expect((textarea as HTMLTextAreaElement).value).toContain('\n')
  })

  it('pre-fills Authorization header with saved token', () => {
    localStorage.setItem('lac_token', 'my-token')
    render(<RequestPanel {...defaults} endpoint={ep()} />)
    const textarea = screen.getByPlaceholderText('Authorization: Bearer {CHANNEL_ACCESS_TOKEN}')
    expect((textarea as HTMLTextAreaElement).value).toBe('Authorization: Bearer my-token')
  })
})
