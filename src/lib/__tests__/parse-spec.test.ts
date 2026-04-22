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
})
