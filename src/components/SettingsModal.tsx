'use client'

import { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getToken, setToken, getChannelSecret, setChannelSecret } from '@/lib/storage'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: () => void
}

export function SettingsModal({ open, onOpenChange, onSave }: Props) {
  const [token, setTokenState] = useState('')
  const [secret, setSecretState] = useState('')

  useEffect(() => {
    if (open) {
      setTokenState(getToken() ?? '')
      setSecretState(getChannelSecret() ?? '')
    }
  }, [open])

  function handleSave() {
    setToken(token)
    setChannelSecret(secret)
    onSave()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Channel Access Token</label>
            <Input
              value={token}
              onChange={e => setTokenState(e.target.value)}
              placeholder="Enter channel access token"
              type="password"
              suppressHydrationWarning
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Channel Secret</label>
            <Input
              value={secret}
              onChange={e => setSecretState(e.target.value)}
              placeholder="Enter channel secret"
              type="password"
              suppressHydrationWarning
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
