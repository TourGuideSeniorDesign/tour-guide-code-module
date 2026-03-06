import React, { useRef, useState, useEffect } from 'react'
import { Bot, Settings } from 'lucide-react'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import { useRosConnection } from './hooks/useRosConnection'
import { useStatusTopic } from './hooks/useStatusTopic'
import { useFanSpeedTopic } from './hooks/useFanSpeedTopic'
import { useSensorsTopic } from './hooks/useSensorsTopic'
import { ConnectionPanel } from './components/ConnectionPanel'
import { StatusPanel } from './components/StatusPanel'
import { FanSpeedPanel } from './components/FanSpeedPanel'
import { SensorsPanel } from './components/SensorsPanel'
import { Badge } from './components/ui/badge'
import { RosConnectionState } from './types/ros'

type BadgeVariant = 'success' | 'warning' | 'error' | 'outline'
const statusConfig: Record<RosConnectionState, { label: string; variant: BadgeVariant; icon: React.ReactNode }> = {
  disconnected: { label: 'Disconnected', variant: 'outline', icon: <WifiOff className="h-3 w-3" /> },
  connecting:   { label: 'Connecting…',  variant: 'warning', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  connected:    { label: 'Connected',    variant: 'success', icon: <Wifi className="h-3 w-3" /> },
  error:        { label: 'Error',        variant: 'error',   icon: <WifiOff className="h-3 w-3" /> },
}

export default function App(): React.JSX.Element {
  const { ros, connectionState, retryCountdown, connect, disconnect } = useRosConnection()
  const status = useStatusTopic(ros)
  const fanSpeed = useFanSpeedTopic(ros)
  const sensors = useSensorsTopic(ros)

  const isConnected = connectionState === 'connected'

  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    if (settingsOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [settingsOpen])

  const { label, variant, icon } = statusConfig[connectionState]

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-background)]">
      {/* Title bar drag region */}
      <div className="h-8 shrink-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />

      {/* Header */}
      <header className="border-b border-[var(--color-border)] px-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]/10">
              <Bot className="h-5 w-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">Autogiro Tour Guide</h1>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">ROS2 Monitor</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={variant}>
              {icon}
              {label}
            </Badge>

            {/* Settings button + dropdown */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setSettingsOpen((o) => !o)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-border)] hover:text-[var(--color-foreground)] transition-colors"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>

              {settingsOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 w-max rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 shadow-lg">
                  <p className="text-xs font-medium text-[var(--color-muted-foreground)] mb-3 uppercase tracking-wider">
                    Connection
                  </p>
                  <ConnectionPanel
                    connectionState={connectionState}
                    retryCountdown={retryCountdown}
                    onConnect={connect}
                    onDisconnect={disconnect}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <StatusPanel status={status} isConnected={isConnected} />
          <FanSpeedPanel fanSpeed={fanSpeed} isConnected={isConnected} />
          <SensorsPanel sensors={sensors} isConnected={isConnected} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] px-6 py-3">
        <p className="text-xs text-[var(--color-muted-foreground)] text-center">
         AUTOGIRO
        </p>
      </footer>
    </div>
  )
}
