import React, { useState } from 'react'
import { Wifi, WifiOff, Loader2, Unplug } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { RosConnectionState } from '../types/ros'

const RETRY_SECONDS = 10
const RING_R = 6
const RING_C = 2 * Math.PI * RING_R

type BadgeVariant = 'success' | 'warning' | 'error' | 'outline'

const stateConfig: Record<
  RosConnectionState,
  { label: string; variant: BadgeVariant; icon: React.ReactNode }
> = {
  disconnected: {
    label: 'Disconnected',
    variant: 'outline',
    icon: <WifiOff className="h-3 w-3" />
  },
  connecting: {
    label: 'Connecting…',
    variant: 'warning',
    icon: <Loader2 className="h-3 w-3 animate-spin" />
  },
  connected: {
    label: 'Connected',
    variant: 'success',
    icon: <Wifi className="h-3 w-3" />
  },
  error: {
    label: 'Connection failed',
    variant: 'error',
    icon: <WifiOff className="h-3 w-3" />
  }
}

interface ConnectionPanelProps {
  connectionState: RosConnectionState
  retryCountdown: number | null
  onConnect: (url: string) => void
  onDisconnect: () => void
}

export function ConnectionPanel({
  connectionState,
  retryCountdown,
  onConnect,
  onDisconnect
}: ConnectionPanelProps): React.JSX.Element {
  const [url, setUrl] = useState('ws://localhost:9090')
  const { label, variant, icon } = stateConfig[connectionState]
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

  const ringOffset = retryCountdown !== null
    ? RING_C * (retryCountdown / RETRY_SECONDS)
    : 0

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

      <div className="flex items-center gap-2 pb-0.5">
        <Badge variant={variant}>
          {icon}
          {label}
        </Badge>

        {retryCountdown !== null && (
          <Badge variant="outline" className="gap-1.5 tabular-nums">
            <svg width="16" height="16" viewBox="0 0 16 16" className="-rotate-90">
              <circle
                cx="8" cy="8" r={RING_R}
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.2"
                strokeWidth="2"
              />
              <circle
                cx="8" cy="8" r={RING_R}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C - ringOffset}
                style={{ transition: 'stroke-dashoffset 0.9s linear' }}
              />
            </svg>
            Retry in {retryCountdown}s
          </Badge>
        )}
      </div>
    </form>
  )
}
