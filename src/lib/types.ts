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
  request: { method: string; url: string; headers: Record<string, string>; body: string }
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

export type SpecName = "messaging" | "login" | "insight" | "liff" | "manage-audience" | "module"
