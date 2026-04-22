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
        <select
          value={spec}
          onChange={e => onSpecChange(e.target.value as SpecName)}
          className="w-full text-xs bg-gray-800 border border-gray-700 text-gray-100 rounded px-2 py-1 mb-3"
        >
          <option value="messaging">Messaging API</option>
          <option value="login">Login API</option>
          <option value="insight">Insight API</option>
          <option value="liff">LIFF API</option>
          <option value="manage-audience">Manage Audience</option>
          <option value="module">Module API</option>
        </select>
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
