'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { getToken } from '@/lib/storage'
import type { Endpoint, ProxyRequest, ProxyResponse } from '@/lib/types'

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-blue-500',
  POST:   'bg-green-500',
  PUT:    'bg-orange-500',
  DELETE: 'bg-red-500',
  PATCH:  'bg-purple-500',
}

type Props = {
  endpoint: Endpoint | null
  onResponse: (req: ProxyRequest, res: ProxyResponse) => void
  onOpenSettings: () => void
}

export function RequestPanel({ endpoint, onResponse, onOpenSettings }: Props) {
  const [pathParams, setPathParams] = useState<Record<string, string>>({})
  const [queryString, setQueryString] = useState('')
  const [headersText, setHeadersText] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    setHasToken(Boolean(getToken()))
  }, [])

  useEffect(() => {
    if (!endpoint) return
    setPathParams({})
    setQueryString('')
    setBody('')
    const token = getToken()
    setHeadersText(token ? `Authorization: Bearer ${token}` : '')
    setHasToken(Boolean(token))
  }, [endpoint?.id])

  function resolveUrl(): string {
    if (!endpoint) return ''
    let url = `https://api.line.me${endpoint.path}`
    for (const [key, value] of Object.entries(pathParams)) {
      url = url.replace(`{${key}}`, encodeURIComponent(value))
    }
    if (queryString.trim()) url += `?${queryString.trim()}`
    return url
  }

  function parseHeaders(): Record<string, string> {
    const result: Record<string, string> = {}
    for (const line of headersText.split('\n')) {
      const colon = line.indexOf(':')
      if (colon === -1) continue
      const key = line.slice(0, colon).trim()
      const value = line.slice(colon + 1).trim()
      if (key) result[key] = value
    }
    return result
  }

  async function handleSend() {
    if (!endpoint) return
    setLoading(true)
    const proxyReq: ProxyRequest = {
      method: endpoint.method,
      url: resolveUrl(),
      headers: parseHeaders(),
      body,
    }
    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proxyReq),
      })
      const data: ProxyResponse = await res.json()
      onResponse(proxyReq, data)
    } finally {
      setLoading(false)
    }
  }

  function prettifyJson() {
    try { setBody(JSON.stringify(JSON.parse(body), null, 2)) } catch {}
  }

  const pathParamNames = endpoint?.parameters.filter(p => p.in === 'path') ?? []

  if (!endpoint) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm border-r">
        Select an endpoint from the sidebar
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col border-r overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b bg-gray-50">
        <span className={`text-white text-xs font-bold px-2 py-1 rounded shrink-0 ${METHOD_COLORS[endpoint.method] ?? 'bg-gray-500'}`}>
          {endpoint.method}
        </span>
        <span className="text-sm font-mono text-gray-700 truncate flex-1">{resolveUrl()}</span>
        <Button size="sm" onClick={handleSend} disabled={loading} className="gap-1 shrink-0">
          <Send className="h-3 w-3" />
          {loading ? 'Sending…' : 'Send'}
        </Button>
      </div>

      {!hasToken && (
        <div className="flex items-center gap-2 mx-3 mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          No Channel Access Token saved.{' '}
          <button className="underline font-medium" onClick={onOpenSettings}>Open Settings</button>
          {' '}to add it.
        </div>
      )}

      <div className="flex-1 overflow-auto p-3 space-y-4">
        {pathParamNames.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Path Parameters</h3>
            <div className="space-y-2">
              {pathParamNames.map(p => (
                <div key={p.name} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-600 w-32 shrink-0">{`{${p.name}}`}</span>
                  <Input
                    value={pathParams[p.name] ?? ''}
                    onChange={e => setPathParams(prev => ({ ...prev, [p.name]: e.target.value }))}
                    placeholder={p.name}
                    className="h-7 text-xs"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Query String</h3>
          <Textarea
            value={queryString}
            onChange={e => setQueryString(e.target.value)}
            placeholder="key=value&foo=bar"
            className="text-xs font-mono resize-none h-16"
          />
        </section>

        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Headers</h3>
          <Textarea
            value={headersText}
            onChange={e => setHeadersText(e.target.value)}
            placeholder="Authorization: Bearer {CHANNEL_ACCESS_TOKEN}"
            className="text-xs font-mono resize-none h-20"
          />
        </section>

        {endpoint.requestBody && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">
                Body ({endpoint.requestBody.contentType})
              </h3>
              <button onClick={prettifyJson} className="text-xs text-blue-500 hover:underline">
                Prettify JSON
              </button>
            </div>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="{ ... JSON ... }"
              className="text-xs font-mono resize-none h-48"
            />
          </section>
        )}
      </div>
    </div>
  )
}
