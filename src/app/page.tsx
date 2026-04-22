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
import insightSpec from '@/lib/specs/insight.json'
import liffSpec from '@/lib/specs/liff.json'
import manageAudienceSpec from '@/lib/specs/manage-audience.json'
import moduleSpec from '@/lib/specs/module.json'

const SPECS = {
  messaging: messagingSpec,
  login: loginSpec,
  insight: insightSpec,
  liff: liffSpec,
  'manage-audience': manageAudienceSpec,
  module: moduleSpec,
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
