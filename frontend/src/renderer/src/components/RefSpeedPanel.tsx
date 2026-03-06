import { Gauge } from 'lucide-react'
import type { AutogiroInterfacesRefSpeed } from '../types/ros'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'

interface RefSpeedPanelProps {
  refSpeed: AutogiroInterfacesRefSpeed | null
  isConnected: boolean
}

interface SpeedBarProps {
  label: string
  value: number
}

function SpeedBar({ label, value }: SpeedBarProps) {
  const absVal = Math.abs(value)
  const isNegative = value < 0
  const barColor = absVal >= 80 ? 'bg-red-500' : absVal >= 50 ? 'bg-amber-400' : 'bg-emerald-400'

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--color-muted-foreground)]">{label}</span>
        <span className="font-mono tabular-nums text-[var(--color-foreground)]">
          {isNegative ? '−' : '+'}{absVal}
          <span className="text-[var(--color-muted-foreground)] ml-0.5">%</span>
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-[var(--color-secondary)]">
        <div
          className={`absolute top-0 h-2 rounded-full transition-all duration-150 ${barColor}`}
          style={{ width: `${absVal / 2}%`, left: isNegative ? `${50 - absVal / 2}%` : '50%' }}
        />
        {/* Center tick */}
        <div className="absolute top-0 left-1/2 h-2 w-px bg-[var(--color-border)] -translate-x-1/2" />
      </div>
    </div>
  )
}

export function RefSpeedPanel({ refSpeed, isConnected }: RefSpeedPanelProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-4 w-4 text-[var(--color-primary)]" />
            Ref Speed
          </CardTitle>
          {refSpeed ? (
            <Badge variant="success">Live</Badge>
          ) : (
            <Badge variant="secondary">No data</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {refSpeed ? (
          <div className="flex flex-col gap-3">
            <SpeedBar label="Left" value={refSpeed.left_speed} />
            <SpeedBar label="Right" value={refSpeed.right_speed} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-24 text-sm text-[var(--color-muted-foreground)]">
            {isConnected
              ? 'Waiting for /ref_speed messages…'
              : 'Connect to rosbridge to receive data'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
