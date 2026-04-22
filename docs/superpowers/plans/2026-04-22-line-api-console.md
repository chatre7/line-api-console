# LINE API Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based LINE API testing console with 3-panel layout, OpenAPI-driven endpoint forms, and request proxying through a Next.js server route.

**Architecture:** Next.js 15 App Router with static OpenAPI JSON files parsed client-side; all requests to LINE API are proxied through `/api/proxy` to avoid CORS; credentials and request history are stored in localStorage.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, shadcn/ui, Vitest

---

## File Map

| File | Responsibility |
|------|----------------|
| `lib/types.ts` | Shared TypeScript types: `Endpoint`, `Parameter`, `RequestBody`, `HistoryEntry`, `ProxyRequest`, `ProxyResponse`, `SpecName` |
| `lib/storage.ts` | localStorage read/write for token, secret, history |
| `lib/parse-spec.ts` | Parse OpenAPI 3.x JSON → `Endpoint[]` |
| `lib/curl.ts` | Generate cURL command string from request params |
| `lib/specs/messaging.json` | LINE Messaging API OpenAPI 3.x spec (downloaded) |
| `lib/specs/login.json` | LINE Login API OpenAPI 3.x spec (downloaded) |
| `app/layout.tsx` | Root layout with font + metadata |
| `app/page.tsx` | Main 3-panel console layout, wires all components, owns shared state |
| `app/api/proxy/route.ts` | Next.js Route Handler that forwards requests to LINE API |
| `components/Sidebar.tsx` | Endpoint list with search, collapsible groups, spec switcher, settings button |
| `components/RequestPanel.tsx` | Request form: path params, query string, headers, body; calls `/api/proxy` |
| `components/ResponsePanel.tsx` | Response display with Body / Headers / cURL tabs |
| `components/HistoryPanel.tsx` | Slide-out history drawer using shadcn Sheet |
| `components/SettingsModal.tsx` | Credential input using shadcn Dialog; writes to localStorage |
| `lib/__tests__/storage.test.ts` | Unit tests for `storage.ts` |
| `lib/__tests__/parse-spec.test.ts` | Unit tests for `parse-spec.ts` |
| `lib/__tests__/curl.test.ts` | Unit tests for `curl.ts` |

---

### Task 1: Scaffold Next.js project with Tailwind + shadcn/ui

**Files:**
- Create: (project root — scaffolded by CLI)

- [ ] **Step 1: Scaffold Next.js app**

Run from the `line-api-console/` directory:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir no --import-alias "@/*" --yes
```
Expected: Next.js 15 project created with App Router, TypeScript, Tailwind v4.

- [ ] **Step 2: Install Vitest + testing utilities**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

Create `vitest.setup.ts`:
```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Initialize shadcn/ui**

```bash
npx shadcn@latest init --defaults
```
Accept defaults when prompted (New York style, neutral color).

- [ ] **Step 5: Add required shadcn components**

```bash
npx shadcn@latest add button input textarea tabs sheet dialog badge scroll-area separator
```
Expected: Components added to `components/ui/`.

- [ ] **Step 6: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: Verify scaffold**

```bash
npm run dev
```
Expected: Next.js dev server starts on http://localhost:3000.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js with Tailwind and shadcn/ui"
```

---

### Task 2: Define shared types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Create lib/types.ts**

```ts
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH"

export type Parameter = {
  name: string
  in: "path" | "query" | "header" | "cookie"
  required: boolean
  description?: string
  schema?: { type: string; enum?: string[] }
}

export type RequestBody = {
  required: boolean
  contentType: string
  description?: string
}

export type Endpoint = {
  id: string
  method: HttpMethod
  path: string
  summary: string
  tag: string
  parameters: Parameter[]
  requestBody?: RequestBody
}

export type HistoryEntry = {
  id: string
  timestamp: number
  endpoint: { method: string; path: string; summary: string }
  request: { url: string; headers: Record<string, string>; body: string }
  response: { status: number; body: string; headers: Record<string, string>; durationMs: number }
}

export type ProxyRequest = {
  method: string
  url: string
  headers: Record<string, string>
  body: string
}

export type ProxyResponse = {
  status: number
  headers: Record<string, string>
  body: string
  durationMs: number
}

export type SpecName = "messaging" | "login"
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

### Task 3: localStorage storage wrapper

**Files:**
- Create: `lib/storage.ts`
- Create: `lib/__tests__/storage.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/__tests__/storage.test.ts`:
```ts
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
  request: { url: 'https://api.line.me/v2/bot/info', headers: {}, body: '' },
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
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test lib/__tests__/storage.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement storage.ts**

Create `lib/storage.ts`:
```ts
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
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npm test lib/__tests__/storage.test.ts
```
Expected: All 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/storage.ts lib/__tests__/storage.test.ts
git commit -m "feat: add localStorage storage wrapper"
```

---

### Task 4: cURL command generator

**Files:**
- Create: `lib/curl.ts`
- Create: `lib/__tests__/curl.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/__tests__/curl.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test lib/__tests__/curl.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement curl.ts**

Create `lib/curl.ts`:
```ts
export function generateCurl(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string,
): string {
  const parts: string[] = [`curl -X ${method} '${url}'`]
  for (const [key, value] of Object.entries(headers)) {
    parts.push(`-H '${key}: ${value}'`)
  }
  if (body.trim()) {
    parts.push(`-d '${body.replace(/'/g, "'\\''")}'`)
  }
  return parts.join(' \\\n  ')
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npm test lib/__tests__/curl.test.ts
```
Expected: All 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/curl.ts lib/__tests__/curl.test.ts
git commit -m "feat: add cURL command generator"
```

---

### Task 5: LINE OpenAPI spec files + parser

**Files:**
- Create: `lib/specs/messaging.json`
- Create: `lib/specs/login.json`
- Create: `lib/parse-spec.ts`
- Create: `lib/__tests__/parse-spec.test.ts`

- [ ] **Step 1: Download LINE OpenAPI specs and convert to JSON**

```bash
mkdir -p lib/specs
npm install -D js-yaml @types/js-yaml
curl -L "https://raw.githubusercontent.com/line/line-openapi/main/messaging.yaml" -o lib/specs/messaging.yaml
curl -L "https://raw.githubusercontent.com/line/line-openapi/main/line-login.yaml" -o lib/specs/login.yaml
node -e "
const y=require('js-yaml'),fs=require('fs');
fs.writeFileSync('lib/specs/messaging.json', JSON.stringify(y.load(fs.readFileSync('lib/specs/messaging.yaml','utf8')),null,2));
fs.writeFileSync('lib/specs/login.json', JSON.stringify(y.load(fs.readFileSync('lib/specs/login.yaml','utf8')),null,2));
console.log('Done');
"
```

If the curl download fails, download manually from https://github.com/line/line-openapi and place as `lib/specs/messaging.yaml` and `lib/specs/login.yaml`, then run the `node -e` conversion command above.

Verify: both JSON files exist and contain `"paths"` at the top level.

```bash
node -e "const m=require('./lib/specs/messaging.json'); console.log('messaging paths:', Object.keys(m.paths).length)"
node -e "const l=require('./lib/specs/login.json'); console.log('login paths:', Object.keys(l.paths).length)"
```

- [ ] **Step 2: Write failing tests for parse-spec**

Create `lib/__tests__/parse-spec.test.ts`:
```ts
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
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test lib/__tests__/parse-spec.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 4: Implement parse-spec.ts**

Create `lib/parse-spec.ts`:
```ts
import type { Endpoint, HttpMethod, Parameter, RequestBody } from './types'

type OpenApiOperation = {
  summary?: string
  tags?: string[]
  parameters?: Array<{
    name: string
    in: string
    required?: boolean
    description?: string
    schema?: { type: string; enum?: string[] }
  }>
  requestBody?: {
    required?: boolean
    description?: string
    content?: Record<string, unknown>
  }
}

type OpenApiSpec = {
  paths: Record<string, Record<string, OpenApiOperation>>
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

export function parseSpec(spec: OpenApiSpec): Endpoint[] {
  const endpoints: Endpoint[] = []

  for (const [path, methods] of Object.entries(spec.paths ?? {})) {
    for (const method of METHODS) {
      const operation = methods[method.toLowerCase()]
      if (!operation) continue

      const parameters: Parameter[] = (operation.parameters ?? []).map(p => ({
        name: p.name,
        in: p.in as Parameter['in'],
        required: p.required ?? false,
        description: p.description,
        schema: p.schema,
      }))

      let requestBody: RequestBody | undefined
      if (operation.requestBody) {
        const contentType = Object.keys(operation.requestBody.content ?? {})[0] ?? 'application/json'
        requestBody = {
          required: operation.requestBody.required ?? false,
          contentType,
          description: operation.requestBody.description,
        }
      }

      endpoints.push({
        id: `${method}:${path}`,
        method,
        path,
        summary: operation.summary ?? path,
        tag: operation.tags?.[0] ?? 'Other',
        parameters,
        requestBody,
      })
    }
  }

  return endpoints
}
```

- [ ] **Step 5: Run tests to verify pass**

```bash
npm test lib/__tests__/parse-spec.test.ts
```
Expected: All 6 tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/parse-spec.ts lib/__tests__/parse-spec.test.ts lib/specs/
git commit -m "feat: add OpenAPI spec parser and LINE spec files"
```

---

### Task 6: API Proxy Route

**Files:**
- Create: `app/api/proxy/route.ts`

- [ ] **Step 1: Implement proxy route**

Create `app/api/proxy/route.ts`:
```ts
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/proxy/route.ts
git commit -m "feat: add LINE API proxy route"
```

---

### Task 7: SettingsModal component

**Files:**
- Create: `components/SettingsModal.tsx`

- [ ] **Step 1: Implement SettingsModal**

Create `components/SettingsModal.tsx`:
```tsx
'use client'

import { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getToken, setToken, getChannelSecret, setChannelSecret } from '@/lib/storage'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: () => void
}

export function SettingsModal({ open, onOpenChange, onSave }: Props) {
  const [token, setTokenState] = useState('')
  const [secret, setSecretState] = useState('')

  useEffect(() => {
    if (open) {
      setTokenState(getToken() ?? '')
      setSecretState(getChannelSecret() ?? '')
    }
  }, [open])

  function handleSave() {
    setToken(token)
    setChannelSecret(secret)
    onSave()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Channel Access Token</label>
            <Input
              value={token}
              onChange={e => setTokenState(e.target.value)}
              placeholder="Enter channel access token"
              type="password"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Channel Secret</label>
            <Input
              value={secret}
              onChange={e => setSecretState(e.target.value)}
              placeholder="Enter channel secret"
              type="password"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors. (`lucide-react` is installed by shadcn/ui automatically.)

- [ ] **Step 3: Commit**

```bash
git add components/SettingsModal.tsx
git commit -m "feat: add SettingsModal component"
```

---

### Task 8: Sidebar component

**Files:**
- Create: `components/Sidebar.tsx`

- [ ] **Step 1: Implement Sidebar**

Create `components/Sidebar.tsx`:
```tsx
'use client'

import { useState, useMemo } from 'react'
import { Search, Settings, ChevronDown, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type { Endpoint, SpecName } from '@/lib/types'

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-blue-100 text-blue-700',
  POST:   'bg-green-100 text-green-700',
  PUT:    'bg-orange-100 text-orange-700',
  DELETE: 'bg-red-100 text-red-700',
  PATCH:  'bg-purple-100 text-purple-700',
}

type Props = {
  endpoints: Endpoint[]
  selectedId: string | null
  spec: SpecName
  onSelectEndpoint: (endpoint: Endpoint) => void
  onSpecChange: (spec: SpecName) => void
  onOpenSettings: () => void
}

export function Sidebar({ endpoints, selectedId, spec, onSelectEndpoint, onSpecChange, onOpenSettings }: Props) {
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q
      ? endpoints.filter(e => e.summary.toLowerCase().includes(q) || e.path.toLowerCase().includes(q))
      : endpoints
  }, [endpoints, search])

  const grouped = useMemo(() => {
    const map = new Map<string, Endpoint[]>()
    for (const e of filtered) {
      const list = map.get(e.tag) ?? []
      list.push(e)
      map.set(e.tag, list)
    }
    return map
  }, [filtered])

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100 w-64 shrink-0 border-r border-gray-800">
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 bg-green-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">L</div>
          <div>
            <div className="text-sm font-semibold">LINE API Console</div>
            <div className="text-xs text-gray-400">{endpoints.length} endpoints</div>
          </div>
        </div>
        <div className="flex gap-1 mb-3">
          {(['messaging', 'login'] as SpecName[]).map(s => (
            <button
              key={s}
              onClick={() => onSpecChange(s)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                spec === s ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {s === 'messaging' ? 'Messaging' : 'Login'}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search APIs..."
            className="pl-7 h-7 text-xs bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-1">
          {[...grouped.entries()].map(([tag, items]) => (
            <div key={tag}>
              <button
                onClick={() => setCollapsed(prev => ({ ...prev, [tag]: !prev[tag] }))}
                className="w-full flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-gray-200 uppercase tracking-wide"
              >
                {collapsed[tag]
                  ? <ChevronRight className="h-3 w-3" />
                  : <ChevronDown className="h-3 w-3" />}
                {tag}
              </button>
              {!collapsed[tag] && items.map(endpoint => (
                <button
                  key={endpoint.id}
                  onClick={() => onSelectEndpoint(endpoint)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-800 text-left ${
                    selectedId === endpoint.id ? 'bg-gray-800' : ''
                  }`}
                >
                  <span className={`shrink-0 text-[10px] font-bold px-1 py-0.5 rounded ${METHOD_COLORS[endpoint.method] ?? 'bg-gray-100 text-gray-700'}`}>
                    {endpoint.method}
                  </span>
                  <span className="truncate text-gray-300">{endpoint.summary}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>

      <Separator className="bg-gray-800" />
      <div className="p-2">
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-gray-200 w-full rounded hover:bg-gray-800"
        >
          <Settings className="h-3.5 w-3.5" />
          Settings
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/Sidebar.tsx
git commit -m "feat: add Sidebar component"
```

---

### Task 9: RequestPanel component

**Files:**
- Create: `components/RequestPanel.tsx`

- [ ] **Step 1: Implement RequestPanel**

Create `components/RequestPanel.tsx`:
```tsx
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/RequestPanel.tsx
git commit -m "feat: add RequestPanel component"
```

---

### Task 10: ResponsePanel component

**Files:**
- Create: `components/ResponsePanel.tsx`

- [ ] **Step 1: Implement ResponsePanel**

Create `components/ResponsePanel.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { Copy } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { generateCurl } from '@/lib/curl'
import type { ProxyRequest, ProxyResponse } from '@/lib/types'

function StatusBadge({ status }: { status: number }) {
  const color =
    status >= 200 && status < 300 ? 'bg-green-100 text-green-700' :
    status >= 400 && status < 500 ? 'bg-red-100 text-red-700' :
    'bg-red-200 text-red-900'
  return <span className={`text-xs font-bold px-2 py-0.5 rounded ${color}`}>{status}</span>
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
      <Copy className="h-3 w-3" />
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function formatJson(text: string): string {
  try { return JSON.stringify(JSON.parse(text), null, 2) } catch { return text }
}

type Props = {
  request: ProxyRequest | null
  response: ProxyResponse | null
}

export function ResponsePanel({ request, response }: Props) {
  if (!response) {
    return (
      <div className="w-1/2 flex items-center justify-center text-gray-400 text-sm bg-gray-50">
        Response will appear here
      </div>
    )
  }

  const curl = request
    ? generateCurl(request.method, request.url, request.headers, request.body)
    : ''
  const formattedBody = formatJson(response.body)

  return (
    <div className="w-1/2 flex flex-col bg-gray-50">
      <div className="flex items-center gap-2 p-3 border-b bg-white">
        <span className="text-xs font-semibold text-gray-500">Response</span>
        <StatusBadge status={response.status} />
        <span className="text-xs text-gray-400">{response.durationMs}ms</span>
      </div>

      <Tabs defaultValue="body" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-3 mt-2 w-fit shrink-0">
          <TabsTrigger value="body" className="text-xs">Body</TabsTrigger>
          <TabsTrigger value="headers" className="text-xs">Headers</TabsTrigger>
          <TabsTrigger value="curl" className="text-xs">cURL</TabsTrigger>
        </TabsList>

        <TabsContent value="body" className="flex-1 flex flex-col p-3 pt-2 overflow-hidden">
          <div className="flex justify-end mb-1">
            <CopyButton text={formattedBody} />
          </div>
          <ScrollArea className="flex-1 rounded border bg-white">
            <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all text-gray-800">
              {formattedBody}
            </pre>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="headers" className="flex-1 p-3 pt-2 overflow-hidden">
          <ScrollArea className="h-full rounded border bg-white">
            <table className="w-full text-xs">
              <tbody>
                {Object.entries(response.headers).map(([key, value]) => (
                  <tr key={key} className="border-b last:border-0">
                    <td className="p-2 font-mono text-gray-500 w-1/3 align-top">{key}</td>
                    <td className="p-2 font-mono text-gray-800 break-all">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="curl" className="flex-1 flex flex-col p-3 pt-2 overflow-hidden">
          <div className="flex justify-end mb-1">
            <CopyButton text={curl} />
          </div>
          <ScrollArea className="flex-1 rounded border bg-white">
            <pre className="p-3 text-xs font-mono whitespace-pre-wrap text-gray-800">{curl}</pre>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/ResponsePanel.tsx
git commit -m "feat: add ResponsePanel component"
```

---

### Task 11: HistoryPanel component

**Files:**
- Create: `components/HistoryPanel.tsx`

- [ ] **Step 1: Implement HistoryPanel**

Create `components/HistoryPanel.tsx`:
```tsx
'use client'

import { Trash2, History } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { clearHistory } from '@/lib/storage'
import type { HistoryEntry } from '@/lib/types'

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-blue-100 text-blue-700',
  POST:   'bg-green-100 text-green-700',
  PUT:    'bg-orange-100 text-orange-700',
  DELETE: 'bg-red-100 text-red-700',
  PATCH:  'bg-purple-100 text-purple-700',
}

function statusColor(s: number): string {
  if (s >= 200 && s < 300) return 'text-green-600'
  if (s >= 400) return 'text-red-600'
  return 'text-gray-600'
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  history: HistoryEntry[]
  onLoadEntry: (entry: HistoryEntry) => void
  onHistoryChange: () => void
}

export function HistoryPanel({ open, onOpenChange, history, onLoadEntry, onHistoryChange }: Props) {
  function handleClear() {
    clearHistory()
    onHistoryChange()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-96 p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <History className="h-4 w-4" />
              Request History
            </SheetTitle>
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-xs gap-1 text-red-500 hover:text-red-600 h-7"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear All
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {history.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-xs text-gray-400">
              No history yet
            </div>
          ) : (
            <div className="divide-y">
              {history.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => { onLoadEntry(entry); onOpenChange(false) }}
                  className="w-full text-left p-3 hover:bg-gray-50 block"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${METHOD_COLORS[entry.endpoint.method] ?? ''}`}>
                      {entry.endpoint.method}
                    </span>
                    <span className={`text-xs font-semibold ${statusColor(entry.response.status)}`}>
                      {entry.response.status}
                    </span>
                    <span className="text-[10px] text-gray-400 ml-auto">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-700 truncate">{entry.endpoint.summary}</div>
                  <div className="text-[10px] text-gray-400 font-mono truncate">{entry.request.url}</div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/HistoryPanel.tsx
git commit -m "feat: add HistoryPanel component"
```

---

### Task 12: Wire main page

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Update layout.tsx**

Replace the contents of `app/layout.tsx` with:
```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LINE API Console',
  description: 'Test LINE APIs with ease',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} overflow-hidden`}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Implement app/page.tsx**

Replace the contents of `app/page.tsx` with:
```tsx
'use client'

import { useState, useEffect } from 'react'
import { History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sidebar } from '@/components/Sidebar'
import { RequestPanel } from '@/components/RequestPanel'
import { ResponsePanel } from '@/components/ResponsePanel'
import { HistoryPanel } from '@/components/HistoryPanel'
import { SettingsModal } from '@/components/SettingsModal'
import { parseSpec } from '@/lib/parse-spec'
import { getHistory, appendHistory } from '@/lib/storage'
import type { Endpoint, HistoryEntry, ProxyRequest, ProxyResponse, SpecName } from '@/lib/types'
import messagingSpec from '@/lib/specs/messaging.json'
import loginSpec from '@/lib/specs/login.json'

const SPECS = {
  messaging: messagingSpec,
  login: loginSpec,
} as const

export default function ConsolePage() {
  const [spec, setSpec] = useState<SpecName>('messaging')
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null)
  const [lastRequest, setLastRequest] = useState<ProxyRequest | null>(null)
  const [lastResponse, setLastResponse] = useState<ProxyResponse | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setEndpoints(parseSpec(SPECS[spec] as any))
    setSelectedEndpoint(null)
    setLastResponse(null)
  }, [spec])

  useEffect(() => {
    setHistory(getHistory())
  }, [])

  function handleResponse(req: ProxyRequest, res: ProxyResponse) {
    setLastRequest(req)
    setLastResponse(res)
    if (selectedEndpoint) {
      appendHistory({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
        endpoint: {
          method: selectedEndpoint.method,
          path: selectedEndpoint.path,
          summary: selectedEndpoint.summary,
        },
        request: req,
        response: res,
      })
      setHistory(getHistory())
    }
  }

  function handleLoadHistoryEntry(entry: HistoryEntry) {
    const found = endpoints.find(
      e => e.method === entry.endpoint.method && e.path === entry.endpoint.path
    )
    if (found) setSelectedEndpoint(found)
    setLastRequest(entry.request)
    setLastResponse(entry.response)
  }

  function handleSettingsSave() {
    // Re-sync hasToken state in RequestPanel by forcing endpoint re-select
    if (selectedEndpoint) {
      const copy = { ...selectedEndpoint }
      setSelectedEndpoint(null)
      setTimeout(() => setSelectedEndpoint(copy), 0)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        endpoints={endpoints}
        selectedId={selectedEndpoint?.id ?? null}
        spec={spec}
        onSelectEndpoint={setSelectedEndpoint}
        onSpecChange={setSpec}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-end px-3 py-1.5 border-b bg-white shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHistoryOpen(true)}
            className="gap-1.5 text-xs"
          >
            <History className="h-3.5 w-3.5" />
            History
            {history.length > 0 && (
              <span className="bg-gray-200 text-gray-600 text-[10px] rounded-full px-1.5">
                {history.length}
              </span>
            )}
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <RequestPanel
            endpoint={selectedEndpoint}
            onResponse={handleResponse}
            onOpenSettings={() => setSettingsOpen(true)}
          />
          <ResponsePanel request={lastRequest} response={lastResponse} />
        </div>
      </div>

      <HistoryPanel
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        history={history}
        onLoadEntry={handleLoadHistoryEntry}
        onHistoryChange={() => setHistory(getHistory())}
      />

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSave={handleSettingsSave}
      />
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 4: Run all unit tests**

```bash
npm test
```
Expected: All tests pass (storage, parse-spec, curl).

- [ ] **Step 5: Start dev server and smoke test**

```bash
npm run dev
```

Open http://localhost:3000 and verify:
1. Sidebar shows Messaging API endpoints grouped by tag
2. "Login" tab switches to LINE Login API endpoints
3. Clicking an endpoint populates RequestPanel with correct URL
4. Endpoints with path params (`{paramId}`) show text inputs
5. POST endpoints show a Body textarea + Prettify JSON button
6. Missing token warning banner appears with clickable "Open Settings"
7. Settings modal saves token and dismisses warning
8. Send button sends request → ResponsePanel shows status, body, headers, cURL
9. History button shows previous requests; clicking one restores it to RequestPanel

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/layout.tsx
git commit -m "feat: wire main console page — LINE API Console complete"
```
