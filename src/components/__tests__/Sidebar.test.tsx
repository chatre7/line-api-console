import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { Sidebar } from '../Sidebar'
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
  endpoints: [ep()],
  selectedId: null,
  spec: 'messaging' as const,
  onSelectEndpoint: vi.fn(),
  onSpecChange: vi.fn(),
  onOpenSettings: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

describe('Sidebar', () => {
  it('shows endpoint count', () => {
    render(<Sidebar {...defaults} endpoints={[ep(), ep({ id: 'POST:/v2/bot/message/push' })]} />)
    expect(screen.getByText('2 endpoints')).toBeInTheDocument()
  })

  it('renders endpoint summary and method badge', () => {
    render(<Sidebar {...defaults} />)
    expect(screen.getByText('Get bot info')).toBeInTheDocument()
    expect(screen.getByText('GET')).toBeInTheDocument()
  })

  it('calls onSelectEndpoint when endpoint is clicked', () => {
    render(<Sidebar {...defaults} />)
    fireEvent.click(screen.getByText('Get bot info'))
    expect(defaults.onSelectEndpoint).toHaveBeenCalledWith(defaults.endpoints[0])
  })

  it('calls onSpecChange when dropdown changes', () => {
    render(<Sidebar {...defaults} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'login' } })
    expect(defaults.onSpecChange).toHaveBeenCalledWith('login')
  })

  it('calls onOpenSettings when Settings button is clicked', () => {
    render(<Sidebar {...defaults} />)
    fireEvent.click(screen.getByText('Settings'))
    expect(defaults.onOpenSettings).toHaveBeenCalled()
  })

  it('filters endpoints by summary when searching', () => {
    const endpoints = [
      ep({ id: 'GET:/v2/bot/info', summary: 'Get bot info' }),
      ep({ id: 'POST:/v2/bot/message/push', summary: 'Send push message', path: '/v2/bot/message/push' }),
    ]
    render(<Sidebar {...defaults} endpoints={endpoints} />)
    fireEvent.change(screen.getByPlaceholderText('Search APIs...'), { target: { value: 'push' } })
    expect(screen.queryByText('Get bot info')).not.toBeInTheDocument()
    expect(screen.getByText('Send push message')).toBeInTheDocument()
  })

  it('filters endpoints by path when searching', () => {
    const endpoints = [
      ep({ id: 'GET:/v2/bot/info', summary: 'Get bot info' }),
      ep({ id: 'GET:/v2/bot/profile', summary: 'Get profile', path: '/v2/bot/profile' }),
    ]
    render(<Sidebar {...defaults} endpoints={endpoints} />)
    fireEvent.change(screen.getByPlaceholderText('Search APIs...'), { target: { value: 'profile' } })
    expect(screen.queryByText('Get bot info')).not.toBeInTheDocument()
    expect(screen.getByText('Get profile')).toBeInTheDocument()
  })

  it('collapses and expands a group when tag header is clicked', () => {
    render(<Sidebar {...defaults} />)
    expect(screen.getByText('Get bot info')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Bot'))
    expect(screen.queryByText('Get bot info')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Bot'))
    expect(screen.getByText('Get bot info')).toBeInTheDocument()
  })

  it('groups endpoints by tag', () => {
    const endpoints = [
      ep({ id: 'GET:/v2/bot/info', tag: 'Bot', summary: 'Bot info' }),
      ep({ id: 'POST:/v2/bot/message/push', tag: 'Message', summary: 'Push message', path: '/v2/bot/message/push' }),
    ]
    render(<Sidebar {...defaults} endpoints={endpoints} />)
    expect(screen.getByText('Bot')).toBeInTheDocument()
    expect(screen.getByText('Message')).toBeInTheDocument()
  })
})
