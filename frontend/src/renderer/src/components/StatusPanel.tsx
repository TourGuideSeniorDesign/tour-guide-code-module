import { Hash, MessageSquare, Tag } from "lucide-react";
import type { AutogiroInterfacesStatus } from "../types/ros";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { EmptyState, PanelHeader } from "./ui/panel";

interface StatusPanelProps {
  status: AutogiroInterfacesStatus | null;
  isConnected: boolean;
}

export function StatusPanel({ status, isConnected }: StatusPanelProps) {
  return (
    <Card className="flex flex-col">
      <PanelHeader
        icon={<MessageSquare className="h-4 w-4 text-[var(--color-primary)]" />}
        title="Status"
        badge={!isConnected && <Badge variant="secondary">No data</Badge>}
      />

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
                <span className="font-mono text-2xl font-bold tabular-nums">
                  {status.count}
                </span>
              </div>
            </div>
          </>
        ) : (
          <EmptyState isConnected={isConnected} topic="/status" />
        )}
      </CardContent>
    </Card>
  );
}
