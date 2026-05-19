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
  onPublish: (
    message: RefSpeedCommand,
  ) => Promise<{ ok: boolean; error?: string }>;
}

const ZERO_COMMAND: RefSpeedCommand = {
  left_speed: 0,
  right_speed: 0,
  lat_disp: 0,
  long_disp: 0,
};

const PUBLISH_INTERVAL_MS = 100;
const WASD_TICK_MS = 33;
const CARD_WIDTH = 288;
const DEFAULT_POSITION = { x: 24, y: 0 };
const WASD_RATE_DEFAULT = 1;
const WASD_RATE_MIN = 0.5;
const WASD_RATE_MAX = 20;
const WASD_TURN_SCALE = 0.25;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function stepToward(current: number, target: number, maxDelta: number): number {
  const delta = target - current;
  if (Math.abs(delta) <= maxDelta) return target;
  return current + Math.sign(delta) * maxDelta;
}

function toCommand(x: number, y: number, multiplier: number): RefSpeedCommand {
  const forward = -y;
  const turn = x;
  const left = clamp((forward + turn) * multiplier, -1, 1);
  const right = clamp((forward - turn) * multiplier, -1, 1);

  return {
    left_speed: left,
    right_speed: right,
    lat_disp: Math.round(x * 100 * multiplier),
    long_disp: Math.round(forward * 100 * multiplier),
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
  const stickRef = useRef({ x: 0, y: 0 });
  const multiplierRef = useRef(1);
  const keysRef = useRef<Set<string>>(new Set());
  const keyTargetRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const wasdRateRef = useRef(WASD_RATE_DEFAULT);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [wasdEnabled, setWasdEnabled] = useState(false);
  const [wasdRate, setWasdRate] = useState(WASD_RATE_DEFAULT);
  const [cardPos, setCardPos] = useState<{ x: number; y: number }>(() => ({
    x: DEFAULT_POSITION.x,
    y:
      typeof window !== "undefined"
        ? window.innerHeight - 560
        : DEFAULT_POSITION.y,
  }));
  const cardDragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

  const publishZero = useCallback(() => {
    commandRef.current = ZERO_COMMAND;
    stickRef.current = { x: 0, y: 0 };
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

      stickRef.current = next;
      setPosition(next);
      commandRef.current = toCommand(next.x, next.y, multiplierRef.current);
    },
    [enabled],
  );

  useEffect(() => {
    multiplierRef.current = multiplier;
    commandRef.current = toCommand(
      stickRef.current.x,
      stickRef.current.y,
      multiplier,
    );
  }, [multiplier]);

  useEffect(() => {
    wasdRateRef.current = wasdRate;
  }, [wasdRate]);

  useEffect(() => {
    draggingRef.current = dragging;
  }, [dragging]);

  useEffect(() => {
    if (!enabled || !wasdEnabled) {
      if (keysRef.current.size > 0 || keyTargetRef.current.x !== 0 || keyTargetRef.current.y !== 0) {
        keysRef.current.clear();
        keyTargetRef.current = { x: 0, y: 0 };
        stickRef.current = { x: 0, y: 0 };
        setPosition({ x: 0, y: 0 });
        commandRef.current = ZERO_COMMAND;
      }
      return;
    }

    const recomputeTarget = (): void => {
      const keys = keysRef.current;
      let x = 0;
      let y = 0;
      if (keys.has("w")) y -= 1;
      if (keys.has("s")) y += 1;
      if (keys.has("a")) x -= 1;
      if (keys.has("d")) x += 1;
      x *= WASD_TURN_SCALE;
      const mag = Math.hypot(x, y);
      if (mag > 1) {
        x /= mag;
        y /= mag;
      }
      keyTargetRef.current = { x, y };
    };

    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (key !== "w" && key !== "a" && key !== "s" && key !== "d") return;
      event.preventDefault();
      if (event.repeat) return;
      keysRef.current.add(key);
      recomputeTarget();
    };

    const onKeyUp = (event: KeyboardEvent): void => {
      const key = event.key.toLowerCase();
      if (key !== "w" && key !== "a" && key !== "s" && key !== "d") return;
      if (!keysRef.current.has(key)) return;
      keysRef.current.delete(key);
      recomputeTarget();
    };

    const onBlur = (): void => {
      if (keysRef.current.size === 0) return;
      keysRef.current.clear();
      recomputeTarget();
    };

    let lastTick = performance.now();
    const tick = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - lastTick) / 1000;
      lastTick = now;
      if (draggingRef.current) return;
      const cur = stickRef.current;
      const target = keyTargetRef.current;
      if (cur.x === target.x && cur.y === target.y) return;
      const maxDelta = wasdRateRef.current * dt;
      const nx = stepToward(cur.x, target.x, maxDelta);
      const ny = stepToward(cur.y, target.y, maxDelta);
      stickRef.current = { x: nx, y: ny };
      setPosition({ x: nx, y: ny });
      commandRef.current = toCommand(nx, ny, multiplierRef.current);
    }, WASD_TICK_MS);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.clearInterval(tick);
      keysRef.current.clear();
      keyTargetRef.current = { x: 0, y: 0 };
    };
  }, [enabled, wasdEnabled]);

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

  useEffect(() => {
    function onMove(event: PointerEvent) {
      if (!cardDragRef.current) return;
      const { offsetX, offsetY } = cardDragRef.current;
      const maxX = window.innerWidth - CARD_WIDTH;
      const maxY = window.innerHeight - 80;
      setCardPos({
        x: clamp(event.clientX - offsetX, 0, Math.max(0, maxX)),
        y: clamp(event.clientY - offsetY, 0, Math.max(0, maxY)),
      });
    }
    function onUp() {
      cardDragRef.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const onCardHandleDown = (event: React.PointerEvent<HTMLDivElement>) => {
    cardDragRef.current = {
      offsetX: event.clientX - cardPos.x,
      offsetY: event.clientY - cardPos.y,
    };
  };

  return (
    <Card
      className="fixed z-40 w-72 shadow-xl"
      style={{ left: cardPos.x, top: cardPos.y }}
    >
      <div
        onPointerDown={onCardHandleDown}
        className="cursor-grab active:cursor-grabbing select-none"
      >
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
      </div>
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
              Drag with mouse or touch. Releasing recenters and sends zero
              speed.
            </span>
          </span>
        </label>

        <label
          className={cn(
            "flex items-start gap-3 text-sm",
            !enabled && "opacity-60",
          )}
        >
          <input
            type="checkbox"
            checked={wasdEnabled}
            disabled={!enabled}
            onChange={(event) => setWasdEnabled(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-(--color-primary)"
          />
          <span className="flex flex-col gap-1">
            <span className="font-medium">WASD keyboard control</span>
            <span className="text-xs text-muted-foreground">
              W/S forward/back, A/D turn. Hold keys to drive; release stops.
            </span>
          </span>
        </label>

        {wasdEnabled && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">WASD slew rate</span>
              <span className="font-mono text-muted-foreground">
                {Math.round(wasdRate * 100)} %/s
              </span>
            </div>
            <input
              type="range"
              min={WASD_RATE_MIN}
              max={WASD_RATE_MAX}
              step={0.1}
              value={wasdRate}
              onChange={(event) => setWasdRate(Number(event.target.value))}
              className="w-full accent-(--color-primary)"
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Max speed</span>
            <span className="font-mono text-muted-foreground">
              {Math.round(multiplier * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={multiplier}
            onChange={(event) => setMultiplier(Number(event.target.value))}
            className="w-full accent-(--color-primary)"
          />
        </div>

        <div
          ref={padRef}
          className={cn(
            "relative mx-auto h-44 w-44 select-none rounded-full border border-(--color-border) bg-(--color-secondary) touch-none",
            enabled
              ? "cursor-grab active:cursor-grabbing"
              : "cursor-not-allowed opacity-60",
          )}
          onPointerDown={(event) => {
            if (!enabled) return;
            event.stopPropagation();
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
          <span>Left: {commandRef.current.left_speed.toFixed(4)}</span>
          <span>Right: {commandRef.current.right_speed.toFixed(4)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
