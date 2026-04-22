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
