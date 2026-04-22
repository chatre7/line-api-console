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
