import { NextRequest, NextResponse } from 'next/server'
import type { ProxyRequest, ProxyResponse } from '@/lib/types'

const ALLOWED_HOSTS = ['https://api.line.me', 'https://api-data.line.me']

export async function POST(req: NextRequest) {
  const { method, url, headers, body }: ProxyRequest = await req.json()

  if (!ALLOWED_HOSTS.some(h => url.startsWith(h))) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 400 })
  }

  const init: RequestInit = {
    method,
    headers,
    signal: AbortSignal.timeout(30_000),
  }

  if (body && body.trim() && method !== 'GET' && method !== 'HEAD') {
    init.body = body
  }

  const start = Date.now()
  let response: Response
  try {
    response = await fetch(url, init)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const durationMs = Date.now() - start
  const responseHeaders: Record<string, string> = {}
  response.headers.forEach((value, key) => { responseHeaders[key] = value })

  const contentType = response.headers.get('content-type') ?? ''
  let responseBody: string
  if (contentType.includes('application/json') || contentType.includes('text/')) {
    responseBody = await response.text()
  } else {
    const buffer = await response.arrayBuffer()
    responseBody = `[binary data: ${buffer.byteLength} bytes]`
  }

  const result: ProxyResponse = {
    status: response.status,
    headers: responseHeaders,
    body: responseBody,
    durationMs,
  }

  return NextResponse.json(result)
}
