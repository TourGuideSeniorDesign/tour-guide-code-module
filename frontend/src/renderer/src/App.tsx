import { Bot, Loader2, Settings, Wifi, WifiOff } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { fetchTourData } from "./api/tourData";
import { BatteryPanel } from "./components/BatteryPanel";
import { BrakePanel } from "./components/BrakePanel";
import { ConnectionPanel } from "./components/ConnectionPanel";
import { EmergencyStop } from "./components/EmergencyStop";
import { FanSpeedPanel } from "./components/FanSpeedPanel";
import { JoystickControlPanel } from "./components/JoystickControlPanel";
import { MotorSpeedPanel } from "./components/MotorSpeedPanel";
import { RefSpeedPanel } from "./components/RefSpeedPanel";
import { SensorsPanel } from "./components/SensorsPanel";
import { StatusPanel } from "./components/StatusPanel";
import { TourControlPanel } from "./components/TourControlPanel";
import { Badge } from "./components/ui/badge";
import { VirtualJoystick } from "./components/VirtualJoystick";
import { useRosBridge } from "./hooks/useRosBridge";
import type { RosConnectionState } from "./types/ros";
import type { TourData } from "./types/tour";

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
  const {
    url,
    connectionState,
    retryCountdown,
    topics,
    joystickControl,
    connect,
    disconnect,
    publishTourControl,
    publishRefSpeed,
    publishEbrake,
    setJoystickEnabled,
    refreshJoystickControl,
  } = useRosBridge();
  const [tour, setTour] = useState<TourData | null>(null);

  const isConnected = connectionState === "connected";
  const {
    status,
    fanSpeed,
    sensors,
    refSpeed,
    tourControl,
    battery,
    motorSpeed,
    ebrake,
  } = topics;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showDebugTopics, setShowDebugTopics] = useState(false);
  const [showVirtualJoystick, setShowVirtualJoystick] = useState(false);
  const [virtualJoystickEnabled, setVirtualJoystickEnabled] = useState(false);
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

  useEffect(() => {
    void fetchTourData().then(setTour);
  }, []);

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
            <EmergencyStop
              latestMessage={ebrake}
              isConnected={isConnected}
              onPublish={publishEbrake}
            />

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
                    url={url}
                    connectionState={connectionState}
                    retryCountdown={retryCountdown}
                    onConnect={connect}
                    onDisconnect={disconnect}
                  />
                  {tour && (
                    <div className="mt-4 border-t border-(--color-border) pt-4">
                      <TourControlPanel
                        slides={tour.slides}
                        latestMessage={tourControl}
                        isConnected={isConnected}
                        onPublish={publishTourControl}
                      />
                    </div>
                  )}
                  <div className="mt-4 border-t border-(--color-border) pt-4">
                    <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                      Debug
                    </p>
                    <div className="flex flex-col gap-3">
                      <label className="flex items-start gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={showDebugTopics}
                          onChange={(e) => setShowDebugTopics(e.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-(--color-primary)"
                        />
                        <span className="flex flex-col gap-1">
                          <span className="font-medium">Show status topic</span>
                          <span className="max-w-72 text-xs leading-relaxed text-muted-foreground">
                            Shows the legacy talker/listener /status panel in
                            the main dashboard.
                          </span>
                        </span>
                      </label>
                      <label className="flex items-start gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={showVirtualJoystick}
                          onChange={(e) => {
                            setShowVirtualJoystick(e.target.checked);
                            if (!e.target.checked)
                              setVirtualJoystickEnabled(false);
                          }}
                          className="mt-0.5 h-4 w-4 accent-(--color-primary)"
                        />
                        <span className="flex flex-col gap-1">
                          <span className="font-medium">
                            Show virtual joystick
                          </span>
                          <span className="max-w-72 text-xs leading-relaxed text-muted-foreground">
                            Displays a mouse/touch joystick that can publish to
                            /ref_speed when enabled.
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {showDebugTopics && (
            <StatusPanel status={status} isConnected={isConnected} />
          )}
          <BatteryPanel battery={battery} isConnected={isConnected} />
          <BrakePanel
            ebrake={ebrake}
            isConnected={isConnected}
            onPublish={publishEbrake}
          />
          <JoystickControlPanel
            joystickControl={joystickControl}
            sensors={sensors}
            isConnected={isConnected}
            onSetEnabled={setJoystickEnabled}
            onRefresh={refreshJoystickControl}
          />
          <FanSpeedPanel fanSpeed={fanSpeed} isConnected={isConnected} />
          <MotorSpeedPanel motorSpeed={motorSpeed} isConnected={isConnected} />
          <RefSpeedPanel refSpeed={refSpeed} isConnected={isConnected} />
          <SensorsPanel sensors={sensors} isConnected={isConnected} />
        </div>
      </main>

      {showVirtualJoystick && (
        <VirtualJoystick
          enabled={virtualJoystickEnabled}
          isConnected={isConnected}
          onEnabledChange={setVirtualJoystickEnabled}
          onPublish={publishRefSpeed}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-(--color-border) px-6 py-3">
        <p className="text-xs text-muted-foreground text-center">AUTOGIRO</p>
      </footer>
    </div>
  );
}
