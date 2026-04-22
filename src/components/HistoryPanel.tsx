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
