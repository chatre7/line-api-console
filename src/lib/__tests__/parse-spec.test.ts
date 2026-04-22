import { describe, it, expect } from 'vitest'
import { parseSpec } from '../parse-spec'

const stubSpec = {
  paths: {
    '/v2/bot/info': {
      get: {
        summary: 'Get bot info',
        tags: ['Bot'],
        parameters: [
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer' } },
        ],
      },
    },
    '/v2/bot/message/{messageId}/content': {
      get: {
        summary: 'Get message content',
        tags: ['Message'],
        parameters: [
          { name: 'messageId', in: 'path', required: true, schema: { type: 'string' } },
        ],
      },
    },
    '/v2/bot/message/push': {
      post: {
        summary: 'Send push message',
        tags: ['Message'],
        parameters: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {} } },
        },
      },
    },
  },
}

describe('parseSpec', () => {
  it('returns flat endpoint list', () => {
    expect(parseSpec(stubSpec)).toHaveLength(3)
  })

  it('parses method and path', () => {
    const e = parseSpec(stubSpec).find(e => e.path === '/v2/bot/info')
    expect(e?.method).toBe('GET')
    expect(e?.summary).toBe('Get bot info')
    expect(e?.tag).toBe('Bot')
  })

  it('parses query parameters', () => {
    const e = parseSpec(stubSpec).find(e => e.path === '/v2/bot/info')
    expect(e?.parameters).toHaveLength(1)
    expect(e?.parameters[0].name).toBe('limit')
    expect(e?.parameters[0].in).toBe('query')
    expect(e?.parameters[0].required).toBe(false)
  })

  it('parses required path parameters', () => {
    const e = parseSpec(stubSpec).find(e => e.path.includes('{messageId}'))
    expect(e?.parameters[0].in).toBe('path')
    expect(e?.parameters[0].required).toBe(true)
  })

  it('parses requestBody content type', () => {
    const e = parseSpec(stubSpec).find(e => e.path === '/v2/bot/message/push')
    expect(e?.requestBody?.contentType).toBe('application/json')
    expect(e?.requestBody?.required).toBe(true)
  })

  it('generates unique id per endpoint', () => {
    const endpoints = parseSpec(stubSpec)
    const ids = endpoints.map(e => e.id)
    expect(new Set(ids).size).toBe(endpoints.length)
  })

  it('falls back to description when summary is absent', () => {
    const spec = { paths: { '/v2/bot/info': { get: { description: 'First line\nSecond line', tags: ['Bot'] } } } }
    const e = parseSpec(spec)[0]
    expect(e.summary).toBe('First line')
  })

  it('falls back to path when both summary and description are absent', () => {
    const spec = { paths: { '/v2/bot/info': { get: { tags: ['Bot'] } } } }
    const e = parseSpec(spec)[0]
    expect(e.summary).toBe('/v2/bot/info')
  })

  it('derives tag from /v2/bot/<resource> when tag is generic', () => {
    const spec = { paths: { '/v2/bot/richmenu/list': { get: { tags: ['messaging-api'], summary: 'List' } } } }
    const e = parseSpec(spec)[0]
    expect(e.tag).toBe('Richmenu')
  })

  it('derives tag from /bot/<resource> path (no /v2 prefix)', () => {
    const spec = { paths: { '/bot/pnp/push': { post: { tags: ['messaging-api'], summary: 'Push' } } } }
    const e = parseSpec(spec)[0]
    expect(e.tag).toBe('Pnp')
  })

  it('derives OAuth tag for /oauth2 paths', () => {
    const spec = { paths: { '/oauth2/v3/token': { post: { tags: ['channel-access-token'], summary: 'Issue token' } } } }
    const e = parseSpec(spec)[0]
    expect(e.tag).toBe('OAuth')
  })

  it('uses "Other" when tags absent and path is unrecognised', () => {
    const spec = { paths: { '/unknown/path': { get: { summary: 'X' } } } }
    const e = parseSpec(spec)[0]
    expect(e.tag).toBe('Other')
  })

  it('preserves non-generic tag as-is', () => {
    const spec = { paths: { '/v2/bot/info': { get: { tags: ['CustomTag'], summary: 'Info' } } } }
    const e = parseSpec(spec)[0]
    expect(e.tag).toBe('CustomTag')
  })

  it('skips paths with no matching methods', () => {
    const spec = { paths: { '/v2/bot/info': {} } }
    expect(parseSpec(spec)).toHaveLength(0)
  })
})
