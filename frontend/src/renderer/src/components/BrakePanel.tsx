import { AlertTriangle, ShieldCheck } from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { BrakeCommand } from "../../../shared/rosBridge";
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { DataRow, EmptyState, PanelHeader } from "./ui/panel";

interface BrakePanelProps {
  ebrake: BrakeCommand | null;
  isConnected: boolean;
  onPublish: (
    message: BrakeCommand,
  ) => Promise<{ ok: boolean; error?: string }>;
}

export function BrakePanel({
  ebrake,
  isConnected,
  onPublish,
}: BrakePanelProps): React.JSX.Element {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publishBrake = async (brake: boolean): Promise<void> => {
    setPending(true);
    setError(null);
    const result = await onPublish({ brake });
    setPending(false);

    if (!result.ok) {
      setError(result.error ?? "Publish failed");
    }
  };

  const engaged = ebrake?.brake ?? false;

  return (
    <Card className="flex flex-col">
      <PanelHeader
        icon={
          engaged ? (
            <AlertTriangle className="h-4 w-4 text-red-400" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-(--color-primary)" />
          )
        }
        title="Brakes"
        badge={
          ebrake ? (
            <Badge variant={engaged ? "error" : "success"}>
              {engaged ? "E-brake on" : "Released"}
            </Badge>
          ) : (
            <Badge variant="secondary">No data</Badge>
          )
        }
      />

      <CardContent className="flex flex-col gap-4">
        {ebrake ? (
          <div className="rounded-lg bg-(--color-secondary) px-3 py-2">
            <DataRow label="/ebrake" value={engaged ? "engaged" : "released"} />
            <DataRow label="Message" value={`brake: ${String(ebrake.brake)}`} />
          </div>
        ) : (
          <EmptyState
            isConnected={isConnected}
            topic="/ebrake"
            className="h-16"
          />
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!isConnected || pending || engaged}
            onClick={() => void publishBrake(true)}
            className={cn(
              "rounded-md border border-red-500/70 px-3 py-2 text-sm font-semibold text-red-300 transition-colors",
              "hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            Engage
          </button>
          <button
            type="button"
            disabled={!isConnected || pending || !engaged}
            onClick={() => void publishBrake(false)}
            className={cn(
              "rounded-md border border-emerald-500/70 px-3 py-2 text-sm font-semibold text-emerald-300 transition-colors",
              "hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            Release
          </button>
        </div>

        {error && (
          <p role="alert" className="text-xs text-red-400">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
