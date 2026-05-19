import { AlertOctagon, ShieldCheck } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import type { BrakeCommand } from "../../../shared/rosBridge";
import { cn } from "../lib/utils";

interface EmergencyStopProps {
  latestMessage: BrakeCommand | null;
  isConnected: boolean;
  onPublish: (
    message: BrakeCommand,
  ) => Promise<{ ok: boolean; error?: string }>;
}

export function EmergencyStop({
  latestMessage,
  isConnected,
  onPublish,
}: EmergencyStopProps): React.JSX.Element {
  const [engaged, setEngaged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (next: boolean) => {
      setPending(true);
      setError(null);
      const result = await onPublish({ brake: next });
      setPending(false);
      if (!result.ok) {
        setError(result.error ?? "Publish failed");
        return false;
      }
      setEngaged(next);
      return true;
    },
    [onPublish],
  );

  useEffect(() => {
    if (latestMessage) {
      setEngaged(latestMessage.brake);
    }
  }, [latestMessage]);

  useEffect(() => {
    if (!isConnected && engaged) {
      setEngaged(false);
    }
  }, [isConnected, engaged]);

  const onToggle = (): void => {
    if (pending) return;
    void send(!engaged);
  };

  return (
    <>
      {engaged && (
        <div className="fixed inset-x-0 top-0 z-[60] pointer-events-none">
          <div className="h-1 w-full bg-red-500 animate-pulse" />
          <div className="mx-auto mt-2 inline-flex w-full justify-center">
            <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-red-400 bg-red-600 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white shadow-lg">
              <AlertOctagon className="h-3.5 w-3.5" />
              Emergency Brake Engaged
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onToggle}
        disabled={pending || (!engaged && !isConnected)}
        aria-pressed={engaged}
        className={cn(
          "group relative flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-bold uppercase tracking-wider transition-all",
          "disabled:cursor-not-allowed disabled:opacity-50",
          engaged
            ? "bg-red-600 text-white shadow-[0_0_0_3px_rgba(239,68,68,0.35)] hover:bg-red-700 animate-pulse"
            : "border-2 border-red-500/70 bg-red-500/5 text-red-400 hover:bg-red-500/15",
        )}
        title={
          engaged
            ? "Click to release the emergency brake"
            : isConnected
              ? latestMessage
                ? "Click to engage the emergency brake"
                : "Click to engage the emergency brake; waiting for /ebrake status"
              : "ROS not connected"
        }
      >
        {engaged ? (
          <>
            <AlertOctagon className="h-4 w-4" />
            <span>Stopped</span>
            <span className="ml-1 text-[10px] font-medium opacity-80">
              click to release
            </span>
          </>
        ) : (
          <>
            <ShieldCheck className="h-4 w-4" />
            <span>E-Stop</span>
          </>
        )}
      </button>

      {error && (
        <span role="alert" className="ml-2 text-xs text-red-400">
          {error}
        </span>
      )}
    </>
  );
}
