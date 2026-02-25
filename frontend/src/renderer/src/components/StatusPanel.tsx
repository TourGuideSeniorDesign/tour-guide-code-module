import React from 'react'
import { MessageSquare, Hash, Tag } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { StatusMessage } from '../types/ros'

interface StatusPanelProps {
  status: StatusMessage | null
  isConnected: boolean
}

export function StatusPanel({ status, isConnected }: StatusPanelProps): React.JSX.Element {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-[var(--color-primary)]" />
            Status
          </CardTitle>
          {!isConnected && (
            <Badge variant="secondary" className="text-xs">
              No data
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {status ? (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--color-muted-foreground)] uppercase tracking-wider">
                Node
              </span>
              <div className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                <span className="font-mono text-sm">{status.name}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--color-muted-foreground)] uppercase tracking-wider">
                Message
              </span>
              <p className="text-sm leading-relaxed text-[var(--color-foreground)] bg-[var(--color-secondary)] rounded-lg px-3 py-2 font-mono">
                {status.message}
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--color-muted-foreground)] uppercase tracking-wider">
                Count
              </span>
              <div className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                <span className="font-mono text-2xl font-bold tabular-nums">{status.count}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-32 text-sm text-[var(--color-muted-foreground)]">
            {isConnected ? 'Waiting for /status messages…' : 'Connect to rosbridge to receive data'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
