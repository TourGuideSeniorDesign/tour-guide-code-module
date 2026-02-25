import React from 'react'
import { Wind } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { FanGauge } from './FanGauge'
import { AutogiroInterfacesFanSpeed } from '../types/ros'

interface FanSpeedPanelProps {
  fanSpeed: AutogiroInterfacesFanSpeed | null
  isConnected: boolean
}

function getOverallStatus(fanSpeed: AutogiroInterfacesFanSpeed): { label: string; variant: 'success' | 'warning' | 'error' } {
  const max = Math.max(
    fanSpeed.fan_percent_0,
    fanSpeed.fan_percent_1,
    fanSpeed.fan_percent_2,
    fanSpeed.fan_percent_3
  )
  if (max >= 80) return { label: 'High', variant: 'error' }
  if (max >= 50) return { label: 'Moderate', variant: 'warning' }
  return { label: 'Normal', variant: 'success' }
}

export function FanSpeedPanel({ fanSpeed, isConnected }: FanSpeedPanelProps): React.JSX.Element {
  const status = fanSpeed ? getOverallStatus(fanSpeed) : null

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wind className="h-4 w-4 text-[var(--color-primary)]" />
            Fan Speeds
          </CardTitle>
          {status ? (
            <Badge variant={status.variant}>{status.label}</Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              No data
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {fanSpeed ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <FanGauge label="Fan 1" percent={fanSpeed.fan_percent_0} />
            <FanGauge label="Fan 2" percent={fanSpeed.fan_percent_1} />
            <FanGauge label="Fan 3" percent={fanSpeed.fan_percent_2} />
            <FanGauge label="Fan 4" percent={fanSpeed.fan_percent_3} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-sm text-[var(--color-muted-foreground)]">
            {isConnected
              ? 'Waiting for /fan_speed messages…'
              : 'Connect to rosbridge to receive data'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
