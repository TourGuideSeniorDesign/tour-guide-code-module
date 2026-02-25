import React from 'react'
import { Bot } from 'lucide-react'
import { useRosConnection } from './hooks/useRosConnection'
import { useStatusTopic } from './hooks/useStatusTopic'
import { useFanSpeedTopic } from './hooks/useFanSpeedTopic'
import { ConnectionPanel } from './components/ConnectionPanel'
import { StatusPanel } from './components/StatusPanel'
import { FanSpeedPanel } from './components/FanSpeedPanel'

export default function App(): React.JSX.Element {
  const { ros, connectionState, connect, disconnect } = useRosConnection()
  const status = useStatusTopic(ros)
  const fanSpeed = useFanSpeedTopic(ros)

  const isConnected = connectionState === 'connected'

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-background)]">
      {/* Title bar drag region */}
      <div className="h-8 shrink-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />

      {/* Header */}
      <header className="border-b border-[var(--color-border)] px-6 pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]/10">
              <Bot className="h-5 w-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">Autogiro Tour Guide</h1>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">ROS2 Monitor</p>
            </div>
          </div>

          <ConnectionPanel
            connectionState={connectionState}
            onConnect={connect}
            onDisconnect={disconnect}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <StatusPanel status={status} isConnected={isConnected} />
          <FanSpeedPanel fanSpeed={fanSpeed} isConnected={isConnected} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] px-6 py-3">
        <p className="text-xs text-[var(--color-muted-foreground)] text-center">
          Subscribed to <span className="font-mono">/status</span> ·{' '}
          <span className="font-mono">/fan_speed</span> via rosbridge
        </p>
      </footer>
    </div>
  )
}
