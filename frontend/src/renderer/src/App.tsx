import { Bot, Loader2, Settings, Wifi, WifiOff } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { ConnectionPanel } from "./components/ConnectionPanel";
import { FanSpeedPanel } from "./components/FanSpeedPanel";
import { RefSpeedPanel } from "./components/RefSpeedPanel";
import { SensorsPanel } from "./components/SensorsPanel";
import { StatusPanel } from "./components/StatusPanel";
import { Badge } from "./components/ui/badge";
import { useFanSpeedTopic } from "./hooks/useFanSpeedTopic";
import { useRefSpeedTopic } from "./hooks/useRefSpeedTopic";
import { useRosConnection } from "./hooks/useRosConnection";
import { useSensorsTopic } from "./hooks/useSensorsTopic";
import { useStatusTopic } from "./hooks/useStatusTopic";
import type { RosConnectionState } from "./types/ros";

type BadgeVariant = "success" | "warning" | "error" | "outline";
const statusConfig: Record<
  RosConnectionState,
  { label: string; variant: BadgeVariant; icon: React.ReactNode }
> = {
  disconnected: {
    label: "Disconnected",
    variant: "outline",
    icon: <WifiOff className="h-3 w-3" />,
  },
  connecting: {
    label: "Connecting…",
    variant: "warning",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  connected: {
    label: "Connected",
    variant: "success",
    icon: <Wifi className="h-3 w-3" />,
  },
  error: {
    label: "Error",
    variant: "error",
    icon: <WifiOff className="h-3 w-3" />,
  },
};

export default function App(): React.JSX.Element {
  const { ros, connectionState, retryCountdown, connect, disconnect } =
    useRosConnection();
  const status = useStatusTopic(ros);
  const fanSpeed = useFanSpeedTopic(ros);
  const sensors = useSensorsTopic(ros);
  const refSpeed = useRefSpeedTopic(ros);

  const isConnected = connectionState === "connected";

  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(e.target as Node)
      ) {
        setSettingsOpen(false);
      }
    };
    if (settingsOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [settingsOpen]);

  const { label, variant, icon } = statusConfig[connectionState];

  return (
    <div className="flex flex-col min-h-screen bg-(--color-background)">
      {/* Title bar drag region */}
      <div
        className="h-8 shrink-0"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />

      {/* Header */}
      <header className="border-b border-(--color-border) px-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--color-primary)/10">
              <Bot className="h-5 w-5 text-(--color-primary)" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">
                Autogiro Tour Guide
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                ROS2 Monitor
              </p>
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
                type="button"
                onClick={() => setSettingsOpen((o) => !o)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-(--color-border) hover:text-(--color-foreground) transition-colors"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>

              {settingsOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 w-max rounded-lg border border-(--color-border) bg-(--color-background) p-4 shadow-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
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
          <RefSpeedPanel refSpeed={refSpeed} isConnected={isConnected} />
          <SensorsPanel sensors={sensors} isConnected={isConnected} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-(--color-border) px-6 py-3">
        <p className="text-xs text-muted-foreground text-center">AUTOGIRO</p>
      </footer>
    </div>
  );
}
