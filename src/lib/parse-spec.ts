import type { Endpoint, HttpMethod, Parameter, RequestBody } from './types'

type OpenApiOperation = {
  summary?: string
  description?: string
  operationId?: string
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

const GENERIC_TAGS = new Set([
  'messaging-api', 'messaging-api-blob', 'channel-access-token',
  'insight', 'liff', 'manage-audience', 'manage-audience-blob', 'line-module',
])

// Generic tags that map directly to a display name (path-based grouping would fragment them)
const TAG_LABELS: Record<string, string> = {
  'line-module': 'Module',
}

function toTitleCase(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/-/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase())
}

function deriveTag(path: string, tags?: string[]): string {
  const first = tags?.[0]
  if (first && !GENERIC_TAGS.has(first)) return first
  if (first && TAG_LABELS[first]) return TAG_LABELS[first]

  const segments = path.split('/').filter(Boolean)
  if (segments[0] === 'v2' && segments[1] === 'bot' && segments[2]) {
    return toTitleCase(segments[2])
  }
  if (segments[0] === 'bot' && segments[1]) {
    return toTitleCase(segments[1])
  }
  if (segments[0] === 'liff') return 'LIFF'
  if (segments[0]?.startsWith('oauth')) return 'OAuth'
  return first ?? 'Other'
}

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

      const summary = operation.summary ?? operation.description?.split('\n')[0] ?? path
      const tag = deriveTag(path, operation.tags)

      endpoints.push({
        id: `${method}:${path}`,
        method,
        path,
        summary,
        tag,
        parameters,
        requestBody,
      })
    }
  }

  return endpoints
}
