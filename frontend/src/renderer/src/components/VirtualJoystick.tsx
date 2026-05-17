import { Gamepad2 } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RefSpeedCommand } from "../../../shared/rosBridge";
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { PanelHeader } from "./ui/panel";

interface VirtualJoystickProps {
  enabled: boolean;
  isConnected: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onPublish: (message: RefSpeedCommand) => Promise<{ ok: boolean; error?: string }>;
}

const ZERO_COMMAND: RefSpeedCommand = {
  left_speed: 0,
  right_speed: 0,
  lat_disp: 0,
  long_disp: 0,
};

const PUBLISH_INTERVAL_MS = 100;
const MAX_SPEED = 100;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toCommand(x: number, y: number): RefSpeedCommand {
  const forward = -y;
  const turn = x;
  const left = clamp(Math.round((forward + turn) * MAX_SPEED), -MAX_SPEED, MAX_SPEED);
  const right = clamp(Math.round((forward - turn) * MAX_SPEED), -MAX_SPEED, MAX_SPEED);

  return {
    left_speed: left,
    right_speed: right,
    lat_disp: Math.round(x * MAX_SPEED),
    long_disp: Math.round(forward * MAX_SPEED),
  };
}

export function VirtualJoystick({
  enabled,
  isConnected,
  onEnabledChange,
  onPublish,
}: VirtualJoystickProps): React.JSX.Element {
  const padRef = useRef<HTMLDivElement>(null);
  const commandRef = useRef<RefSpeedCommand>(ZERO_COMMAND);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const publishZero = useCallback(() => {
    commandRef.current = ZERO_COMMAND;
    setPosition({ x: 0, y: 0 });
    if (isConnected) void onPublish(ZERO_COMMAND);
  }, [isConnected, onPublish]);

  const updateFromPointer = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || !padRef.current) return;

      const rect = padRef.current.getBoundingClientRect();
      const radius = rect.width / 2;
      const rawX = (event.clientX - rect.left - radius) / radius;
      const rawY = (event.clientY - rect.top - radius) / radius;
      const distance = Math.hypot(rawX, rawY);
      const scale = distance > 1 ? 1 / distance : 1;
      const next = { x: rawX * scale, y: rawY * scale };

      setPosition(next);
      commandRef.current = toCommand(next.x, next.y);
    },
    [enabled],
  );

  useEffect(() => {
    return () => {
      void onPublish(ZERO_COMMAND);
    };
  }, [onPublish]);

  useEffect(() => {
    if (!enabled) {
      publishZero();
      return;
    }

    if (isConnected) void onPublish(commandRef.current);
    const interval = window.setInterval(() => {
      void onPublish(commandRef.current);
    }, PUBLISH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [enabled, isConnected, onPublish, publishZero]);

  return (
    <Card className="fixed bottom-14 left-6 z-40 w-72 shadow-xl">
      <PanelHeader
        icon={<Gamepad2 className="h-4 w-4 text-(--color-primary)" />}
        title="Virtual Joystick"
        badge={
          enabled && isConnected ? (
            <Badge variant="success">Publishing</Badge>
          ) : (
            <Badge variant="secondary">Idle</Badge>
          )
        }
      />
      <CardContent className="flex flex-col gap-4">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onEnabledChange(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-(--color-primary)"
          />
          <span className="flex flex-col gap-1">
            <span className="font-medium">Enable ref speed publishing</span>
            <span className="text-xs text-muted-foreground">
              Drag with mouse or touch. Releasing recenters and sends zero speed.
            </span>
          </span>
        </label>

        <div
          ref={padRef}
          className={cn(
            "relative mx-auto h-44 w-44 select-none rounded-full border border-(--color-border) bg-(--color-secondary) touch-none",
            enabled ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed opacity-60",
          )}
          onPointerDown={(event) => {
            if (!enabled) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
            updateFromPointer(event);
          }}
          onPointerMove={(event) => {
            if (!dragging) return;
            updateFromPointer(event);
          }}
          onPointerUp={() => {
            setDragging(false);
            publishZero();
          }}
          onPointerCancel={() => {
            setDragging(false);
            publishZero();
          }}
        >
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-(--color-border)" />
          <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-(--color-border)" />
          <div
            className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full border border-(--color-primary)/50 bg-(--color-primary)/20 shadow transition-transform duration-75"
            style={{
              transform: `translate(calc(-50% + ${position.x * 66}px), calc(-50% + ${position.y * 66}px))`,
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono text-muted-foreground">
          <span>Left: {commandRef.current.left_speed}%</span>
          <span>Right: {commandRef.current.right_speed}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
