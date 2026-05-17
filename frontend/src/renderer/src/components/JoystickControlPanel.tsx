import { Gamepad2, RefreshCw } from "lucide-react";
import type React from "react";
import { useState } from "react";
import type {
  JoystickControlState,
  SensorsMessage,
} from "../../../shared/rosBridge";
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { DataRow, PanelHeader } from "./ui/panel";

interface JoystickControlPanelProps {
  joystickControl: JoystickControlState;
  sensors: SensorsMessage | null;
  isConnected: boolean;
  onSetEnabled: (enabled: boolean) => Promise<{ ok: boolean; error?: string }>;
  onRefresh: () => Promise<{ ok: boolean; error?: string }>;
}

export function JoystickControlPanel({
  joystickControl,
  sensors,
  isConnected,
  onSetEnabled,
  onRefresh,
}: JoystickControlPanelProps): React.JSX.Element {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabled = joystickControl.enabled;
  const displayError = error ?? joystickControl.error;

  const setEnabled = async (next: boolean): Promise<void> => {
    setPending(true);
    setError(null);
    const result = await onSetEnabled(next);
    setPending(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to update joystick module");
    }
  };

  const refresh = async (): Promise<void> => {
    setPending(true);
    setError(null);
    const result = await onRefresh();
    setPending(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to refresh joystick module");
    }
  };

  return (
    <Card className="flex flex-col">
      <PanelHeader
        icon={<Gamepad2 className="h-4 w-4 text-(--color-primary)" />}
        title="Joystick Module"
        badge={
          enabled === null ? (
            <Badge variant="secondary">Unknown</Badge>
          ) : enabled ? (
            <Badge variant="success">Enabled</Badge>
          ) : (
            <Badge variant="outline">Disabled</Badge>
          )
        }
      />

      <CardContent className="flex flex-col gap-4">
        <div className="rounded-lg bg-(--color-secondary) px-3 py-2">
          <DataRow
            label="Node parameter"
            value={enabled === null ? "unknown" : String(enabled)}
          />
          <DataRow label="Node" value="/joystick_control" />
          <DataRow label="Parameter" value="enabled" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!isConnected || pending || enabled === true}
            onClick={() => void setEnabled(true)}
            className={cn(
              "rounded-md border border-emerald-500/70 px-3 py-2 text-sm font-semibold text-emerald-300 transition-colors",
              "hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            Enable
          </button>
          <button
            type="button"
            disabled={!isConnected || pending || enabled === false}
            onClick={() => void setEnabled(false)}
            className={cn(
              "rounded-md border border-amber-500/70 px-3 py-2 text-sm font-semibold text-amber-300 transition-colors",
              "hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            Disable
          </button>
        </div>

        <button
          type="button"
          disabled={!isConnected || pending}
          onClick={() => void refresh()}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-(--color-border) px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-(--color-secondary) disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", pending && "animate-spin")} />
          Refresh status
        </button>

        {sensors && (
          <div className="rounded-lg bg-(--color-secondary) px-3 py-2">
            <DataRow label="Joystick lat" value={sensors.lat_disp} unit="%" />
            <DataRow label="Joystick long" value={sensors.long_disp} unit="%" />
          </div>
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">
          Toggles the ROS2 <span className="font-mono">enabled</span> parameter
          on
          <span className="font-mono"> /joystick_control</span>. When disabled,
          the node stops publishing joystick-derived
          <span className="font-mono"> /ref_speed</span> commands and sends
          zero.
        </p>

        {displayError && (
          <p role="alert" className="text-xs text-red-400">
            {displayError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
