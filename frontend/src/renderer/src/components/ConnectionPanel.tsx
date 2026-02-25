import React, { useState } from 'react'
import { Wifi, WifiOff, Loader2, Unplug } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { RosConnectionState } from '../types/ros'

interface ConnectionPanelProps {
  connectionState: RosConnectionState
  onConnect: (url: string) => void
  onDisconnect: () => void
}

const stateConfig: Record<
  RosConnectionState,
  { label: string; color: string; icon: React.ReactNode }
> = {
  disconnected: {
    label: 'Disconnected',
    color: 'text-zinc-400',
    icon: <WifiOff className="h-4 w-4" />
  },
  connecting: {
    label: 'Connecting…',
    color: 'text-amber-400',
    icon: <Loader2 className="h-4 w-4 animate-spin" />
  },
  connected: {
    label: 'Connected',
    color: 'text-emerald-400',
    icon: <Wifi className="h-4 w-4" />
  },
  error: {
    label: 'Connection failed',
    color: 'text-red-400',
    icon: <WifiOff className="h-4 w-4" />
  }
}

export function ConnectionPanel({
  connectionState,
  onConnect,
  onDisconnect
}: ConnectionPanelProps): React.JSX.Element {
  const [url, setUrl] = useState('ws://localhost:9090')
  const state = stateConfig[connectionState]
  const isConnected = connectionState === 'connected'
  const isConnecting = connectionState === 'connecting'

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (isConnected) {
      onDisconnect()
    } else {
      onConnect(url)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex flex-col gap-1.5 min-w-72">
        <Label htmlFor="ros-url">Rosbridge URL</Label>
        <Input
          id="ros-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="ws://localhost:9090"
          disabled={isConnected || isConnecting}
        />
      </div>

      <Button
        type="submit"
        variant={isConnected ? 'outline' : 'default'}
        disabled={isConnecting}
        className="shrink-0"
      >
        {isConnecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isConnected ? (
          <Unplug className="h-4 w-4" />
        ) : (
          <Wifi className="h-4 w-4" />
        )}
        {isConnecting ? 'Connecting' : isConnected ? 'Disconnect' : 'Connect'}
      </Button>

      <div className={`flex items-center gap-2 text-sm pb-0.5 ${state.color}`}>
        {state.icon}
        <span>{state.label}</span>
      </div>
    </form>
  )
}
