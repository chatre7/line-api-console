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
