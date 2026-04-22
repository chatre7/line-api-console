import { describe, it, expect } from 'vitest'
import { generateCurl } from '../curl'

describe('generateCurl', () => {
  it('generates basic GET with no headers or body', () => {
    const result = generateCurl('GET', 'https://api.line.me/v2/bot/info', {}, '')
    expect(result).toBe("curl -X GET 'https://api.line.me/v2/bot/info'")
  })

  it('includes headers', () => {
    const result = generateCurl('GET', 'https://api.line.me/v2/bot/info', {
      Authorization: 'Bearer tok',
    }, '')
    expect(result).toContain("-H 'Authorization: Bearer tok'")
  })

  it('includes body for POST', () => {
    const result = generateCurl('POST', 'https://api.line.me/v2/bot/message/push', {}, '{"to":"uid"}')
    expect(result).toContain(`-d '{"to":"uid"}'`)
  })

  it('omits -d when body is empty', () => {
    const result = generateCurl('GET', 'https://api.line.me/v2/bot/info', {}, '')
    expect(result).not.toContain('-d')
  })
})
