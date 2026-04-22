# LINE API Console — Design Spec

**Date:** 2026-04-22
**Status:** Approved

---

## Overview

A web-based console for testing LINE APIs, similar to Swagger UI but tailored specifically for LINE's Messaging API and LINE Login API. Users enter a Channel Access Token once via Settings, then browse and send API requests from a 3-panel interface.

---

## Tech Stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| CSS | Tailwind CSS + shadcn/ui |
| Deployment | Vercel |

---

## Architecture

```
line-api-console/
├── app/
│   ├── page.tsx                  # Main console UI (3-panel layout)
│   ├── layout.tsx
│   └── api/
│       └── proxy/route.ts        # Forwards requests to LINE API
├── lib/
│   ├── specs/
│   │   ├── messaging.json        # LINE Messaging API OpenAPI spec
│   │   └── login.json            # LINE Login API OpenAPI spec
│   ├── parse-spec.ts             # OpenAPI JSON → Endpoint[]
│   └── storage.ts                # localStorage wrapper (token, secret, history)
├── components/
│   ├── Sidebar.tsx               # Endpoint list + search + grouping
│   ├── RequestPanel.tsx          # Path params / query / headers / body form
│   ├── ResponsePanel.tsx         # Body / Headers / cURL tabs
│   ├── HistoryPanel.tsx          # Request history drawer
│   └── SettingsModal.tsx         # Credential input modal
└── public/
```

---

## Data Flow

1. App startup → parse `lib/specs/messaging.json` and `lib/specs/login.json` → build flat `Endpoint[]`
2. User selects endpoint in Sidebar → RequestPanel generates form fields from OpenAPI parameters
3. User fills in fields → clicks Send
4. RequestPanel POSTs to `/api/proxy` with `{ method, url, headers, body }`
5. `/api/proxy` forwards request to LINE API → returns `{ status, headers, body, durationMs }`
6. ResponsePanel displays result; entry is appended to localStorage history

---

## Components

### `Sidebar`
- Renders endpoint list grouped by OpenAPI tag (e.g., `WEBHOOK SETTING`, `RICHMENU - SET`)
- Groups are collapsible
- Search bar filters by endpoint summary and path (real-time)
- Method badges: GET=blue, POST=green, PUT=orange, DELETE=red
- Shows spec switcher: Messaging API / LINE Login API
- Bottom: Settings gear icon opens SettingsModal

### `RequestPanel`
- Top bar: HTTP method badge + full resolved URL
- Auto-generates input fields from OpenAPI spec:
  - **Path parameters** — text inputs that replace `{paramName}` in URL
  - **Query string** — textarea
  - **Headers** — textarea, pre-filled with `Authorization: Bearer {token}` from localStorage
  - **Body (JSON)** — textarea with "Prettify JSON" button
- Warning banner if no Channel Access Token is saved
- Send button (disabled while request is in-flight)

### `ResponsePanel`
- Three tabs via shadcn `Tabs`:
  - **Body** — JSON syntax-highlighted, Copy button
  - **Headers** — key/value table of response headers
  - **cURL** — generated curl command equivalent to the sent request, Copy button
- Status code badge (200–299=green, 400–499=red, 500+=dark red)
- Response time in ms displayed next to status badge
- Empty state before first request

### `HistoryPanel`
- Slide-out drawer (shadcn `Sheet`)
- Lists entries newest-first, max 50 (oldest auto-removed)
- Each entry shows: method badge, endpoint summary, status code, timestamp
- Click entry → restores full request back into RequestPanel
- Clear All button at top

### `SettingsModal`
- shadcn `Dialog`
- Fields: Channel Access Token, Channel Secret
- Save → writes to localStorage
- Cancel → discards changes
- Opened from gear icon in Sidebar footer

---

## Types

```ts
type Endpoint = {
  id: string
  method: "GET" | "POST" | "PUT" | "DELETE"
  path: string
  summary: string
  tag: string
  parameters: Parameter[]
  requestBody?: RequestBody
}

type HistoryEntry = {
  id: string
  timestamp: number
  endpoint: { method: string; path: string; summary: string }
  request: { url: string; headers: Record<string, string>; body: string }
  response: { status: number; body: string; headers: Record<string, string>; durationMs: number }
}
```

---

## API Proxy (`/api/proxy`)

**Request (POST):**
```json
{
  "method": "POST",
  "url": "https://api.line.me/v2/bot/message/push",
  "headers": { "Authorization": "Bearer xxx", "Content-Type": "application/json" },
  "body": "{ \"to\": \"...\", \"messages\": [] }"
}
```

**Response:**
```json
{
  "status": 200,
  "headers": { "content-type": "application/json" },
  "body": "{}",
  "durationMs": 142
}
```

Edge cases handled:
- `multipart/form-data` (upload rich menu image)
- Binary/non-JSON responses
- LINE API error format: `{ "message": "...", "details": [...] }`
- Request timeout (30s limit)

---

## localStorage Keys

| Key | Value |
|-----|-------|
| `lac_token` | Channel Access Token string |
| `lac_secret` | Channel Secret string |
| `lac_history` | JSON array of `HistoryEntry[]` (max 50) |

---

## OpenAPI Spec Files

- `lib/specs/messaging.json` — downloaded from LINE Developers: https://developers.line.biz/en/docs/messaging-api/openapi-spec/
- `lib/specs/login.json` — downloaded from LINE Developers: https://developers.line.biz/en/docs/line-login/openapi-spec/
- Parsed at app startup (client-side) via `lib/parse-spec.ts`
- To update: replace the JSON files and redeploy

---

## Out of Scope

- User authentication / multi-user support
- Server-side credential storage
- Real-time webhook testing
- LINE Pay, LIFF, Social API (future iteration)
- Export/import history
