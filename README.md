# LINE API Console

A web-based console for testing LINE APIs — similar to Swagger UI but tailored for LINE's ecosystem. Enter your Channel Access Token once, then browse and send API requests from a clean 3-panel interface.

![LINE API Console](https://img.shields.io/badge/LINE-Messaging%20API-00C300?style=flat&logo=line)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript)

## Features

- **106 endpoints across 6 API specs** from LINE's official OpenAPI specs
- **3-panel layout** — Sidebar (endpoint list) · Request form · Response viewer
- **Grouped sidebar** — endpoints organized by resource with collapsible groups and real-time search
- **Auto-generated forms** — path parameters, query strings, headers, and JSON body pre-filled from the OpenAPI spec
- **Response viewer** — JSON syntax highlighting, response headers table, and generated cURL command
- **Request history** — last 50 requests stored in localStorage, click any entry to restore it
- **Credentials stored locally** — Channel Access Token and Channel Secret saved in `localStorage`, never sent to any server other than LINE

## Tech Stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Testing | Vitest |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Enter your credentials

Click the gear icon at the bottom of the sidebar and enter your **Channel Access Token** (and optionally Channel Secret). Credentials are saved to `localStorage` and never leave your browser except when forwarded to `api.line.me`.

## How It Works

```
Browser → /api/proxy (Next.js route) → api.line.me
```

All LINE API calls go through a server-side proxy at `/api/proxy` to avoid CORS issues. The proxy only forwards requests to `api.line.me` and `api-data.line.me` (hardcoded allowlist), with a 30-second timeout.

## Supported APIs

| Spec | Endpoints | Description |
|------|-----------|-------------|
| Messaging API | 73 | Send messages, manage rich menus, webhooks, audience |
| Login API | 8 | Issue and revoke channel access tokens |
| Insight API | 5 | Message delivery stats, follower analytics |
| LIFF API | 4 | Create and manage LIFF apps |
| Manage Audience | 12 | Create and manage audience groups for narrowcast |
| Module API | 4 | LINE Module attach/detach and chat control |

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main console UI (3-panel layout)
│   └── api/proxy/route.ts    # Proxy to LINE API
├── components/
│   ├── Sidebar.tsx           # Endpoint list, search, spec switcher dropdown
│   ├── RequestPanel.tsx      # Auto-generated request form
│   ├── ResponsePanel.tsx     # Body / Headers / cURL tabs
│   ├── HistoryPanel.tsx      # Request history drawer
│   └── SettingsModal.tsx     # Credential input
└── lib/
    ├── specs/
    │   ├── messaging.json    # Messaging API
    │   ├── login.json        # Login / Channel Access Token API
    │   ├── insight.json      # Insight API
    │   ├── liff.json         # LIFF API
    │   ├── manage-audience.json  # Manage Audience API
    │   └── module.json       # Module API
    ├── parse-spec.ts         # OpenAPI → Endpoint[] with smart tag grouping
    ├── storage.ts            # localStorage wrapper
    └── curl.ts               # cURL command generator
```

## Updating API Specs

Specs are sourced from [line/line-openapi](https://github.com/line/line-openapi). To update:

```bash
# Download latest YAML specs
curl -sL https://raw.githubusercontent.com/line/line-openapi/more-url/messaging-api.yml       -o src/lib/specs/messaging.yaml
curl -sL https://raw.githubusercontent.com/line/line-openapi/more-url/channel-access-token.yml -o src/lib/specs/login.yaml
curl -sL https://raw.githubusercontent.com/line/line-openapi/more-url/insight.yml              -o src/lib/specs/insight.yaml
curl -sL https://raw.githubusercontent.com/line/line-openapi/more-url/liff.yml                 -o src/lib/specs/liff.yaml
curl -sL https://raw.githubusercontent.com/line/line-openapi/more-url/manage-audience.yml      -o src/lib/specs/manage-audience.yaml
curl -sL https://raw.githubusercontent.com/line/line-openapi/more-url/module.yml               -o src/lib/specs/module.yaml

# Convert all to JSON (requires js-yaml)
node -e "
const fs = require('fs'), yaml = require('js-yaml');
const specs = ['messaging','login','insight','liff','manage-audience','module'];
for (const name of specs) {
  const json = yaml.load(fs.readFileSync('src/lib/specs/' + name + '.yaml', 'utf8'));
  fs.writeFileSync('src/lib/specs/' + name + '.json', JSON.stringify(json, null, 2));
  console.log(name, 'done');
}
"
```

## localStorage Keys

| Key | Value |
|-----|-------|
| `lac_token` | Channel Access Token |
| `lac_secret` | Channel Secret |
| `lac_history` | JSON array of last 50 requests |

## Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/chatre7/line-api-console)

No environment variables required — everything runs client-side or through the built-in proxy.
