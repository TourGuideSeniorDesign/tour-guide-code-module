"use client";

import {
  BatteryFull,
  Compass,
  EyeOff,
  Gauge,
  Radar,
  Radio,
  Signal,
  Wind,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

type Battery = {
  voltage: number;
  current_amps: number;
  consumed_ah: number;
  battery_percent: number;
  received_at: number;
};

type Motors = {
  left_mph: number;
  right_mph: number;
  received_at: number;
};

type Sensors = {
  ultrasonic_front_0: number;
  ultrasonic_front_1: number;
  ultrasonic_back: number;
  ultrasonic_left: number;
  ultrasonic_right: number;
  pir_front: boolean;
  pir_back: boolean;
  pir_left: boolean;
  pir_right: boolean;
  fan_speed_0: number;
  fan_speed_1: number;
  fan_speed_2: number;
  fan_speed_3: number;
  linear_acceleration: { x: number; y: number; z: number };
  angular_velocity: { x: number; y: number; z: number };
  magnetic_field: { x: number; y: number; z: number };
  received_at: number;
};

type RosState = {
  topics: {
    battery?: Battery;
    motor_speed?: Motors;
    sensors?: Sensors;
  };
  server_time: number;
};

function freshness(received_at: number | undefined, server_time: number) {
  if (received_at == null) return { label: "never", stale: true };
  const age = server_time - received_at;
  if (age < 5) return { label: `${age.toFixed(1)}s ago`, stale: false };
  return { label: `${age.toFixed(0)}s ago`, stale: age > 10 };
}

export default function StatusPage() {
  const [ros, setRos] = useState<RosState | null>(null);
  const [rosError, setRosError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEmpty, setShowEmpty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const rosRes = await fetch("/api/ros", { cache: "no-store" }).then(
        async (r) => {
          if (r.ok) return (await r.json()) as RosState;
          return { error: (await r.json())?.error ?? "fetch failed" };
        },
      );
      if (cancelled) return;
      if ("error" in rosRes) {
        setRos(null);
        setRosError(rosRes.error as string);
      } else {
        setRos(rosRes as RosState);
        setRosError(null);
      }
      setLoading(false);
    };
    load();
    const interval = setInterval(load, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="text-sm text-(--color-muted-foreground)">Loading…</div>
    );
  }

  const battery = ros?.topics.battery;
  const motors = ros?.topics.motor_speed;
  const sensors = ros?.topics.sensors;
  const serverTime = ros?.server_time ?? 0;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Live (ROS)</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEmpty((v) => !v)}
              title={showEmpty ? "Hide empty panels" : "Show empty panels"}
              className="flex h-6 w-6 items-center justify-center rounded text-(--color-muted-foreground) opacity-50 transition-opacity hover:opacity-100"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </button>
            <Badge variant={rosError ? "warning" : "success"}>
              <Signal className="h-3 w-3" />
              {rosError ? "Bridge down" : "Streaming"}
            </Badge>
          </div>
        </div>
        {rosError && (
          <div className="rounded-lg border border-amber-300/40 bg-amber-100/40 px-4 py-3 text-sm text-amber-900">
            ROS bridge unreachable: {rosError}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(battery || showEmpty) && (
            <PanelCard
              icon={<BatteryFull className="h-4 w-4" />}
              title="Battery"
              age={freshness(battery?.received_at, serverTime)}
            >
              {battery ? (
                <>
                  <div className="text-3xl font-bold tabular-nums">
                    {battery.battery_percent.toFixed(1)}
                    <span className="ml-0.5 text-base font-medium text-(--color-muted-foreground)">
                      %
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-(--color-secondary)">
                    <div
                      className={`h-full transition-all ${
                        battery.battery_percent > 20
                          ? "bg-emerald-500"
                          : "bg-red-500"
                      }`}
                      style={{
                        width: `${Math.max(0, Math.min(100, battery.battery_percent))}%`,
                      }}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-(--color-muted-foreground)">
                    <Metric label="Volt" value={`${battery.voltage.toFixed(2)} V`} />
                    <Metric label="Curr" value={`${battery.current_amps.toFixed(2)} A`} />
                    <Metric label="Used" value={`${battery.consumed_ah.toFixed(2)} Ah`} />
                  </div>
                </>
              ) : (
                <Empty />
              )}
            </PanelCard>
          )}

          {(motors || showEmpty) && (
            <PanelCard
              icon={<Gauge className="h-4 w-4" />}
              title="Wheel Speeds"
              age={freshness(motors?.received_at, serverTime)}
            >
              {motors ? (
                <div className="grid grid-cols-2 gap-3">
                  <SpeedReadout label="Left" value={motors.left_mph} />
                  <SpeedReadout label="Right" value={motors.right_mph} />
                </div>
              ) : (
                <Empty />
              )}
            </PanelCard>
          )}

          {(sensors || showEmpty) && (
            <PanelCard
              icon={<Radar className="h-4 w-4" />}
              title="Ultrasonics (cm)"
              age={freshness(sensors?.received_at, serverTime)}
            >
              {sensors ? (
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-xs">
                  <DataRow label="Front 0" value={sensors.ultrasonic_front_0} />
                  <DataRow label="Front 1" value={sensors.ultrasonic_front_1} />
                  <DataRow label="Back" value={sensors.ultrasonic_back} />
                  <DataRow label="Left" value={sensors.ultrasonic_left} />
                  <DataRow label="Right" value={sensors.ultrasonic_right} />
                </div>
              ) : (
                <Empty />
              )}
            </PanelCard>
          )}

          {(sensors || showEmpty) && (
            <PanelCard
              icon={<Radio className="h-4 w-4" />}
              title="Motion (PIR)"
              age={freshness(sensors?.received_at, serverTime)}
            >
              {sensors ? (
                <div className="grid grid-cols-2 gap-2">
                  <PirPill label="Front" on={sensors.pir_front} />
                  <PirPill label="Back" on={sensors.pir_back} />
                  <PirPill label="Left" on={sensors.pir_left} />
                  <PirPill label="Right" on={sensors.pir_right} />
                </div>
              ) : (
                <Empty />
              )}
            </PanelCard>
          )}

          {(sensors || showEmpty) && (
            <PanelCard
              icon={<Wind className="h-4 w-4" />}
              title="Fan Speeds"
              age={freshness(sensors?.received_at, serverTime)}
              badge={
                sensors ? (
                  (() => {
                    const status = getFanStatus(sensors);
                    return <Badge variant={status.variant}>{status.label}</Badge>;
                  })()
                ) : null
              }
              className="lg:col-span-2"
            >
              {sensors ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <FanGauge label="Fan 1" percent={sensors.fan_speed_0} />
                  <FanGauge label="Fan 2" percent={sensors.fan_speed_1} />
                  <FanGauge label="Fan 3" percent={sensors.fan_speed_2} />
                  <FanGauge label="Fan 4" percent={sensors.fan_speed_3} />
                </div>
              ) : (
                <Empty />
              )}
            </PanelCard>
          )}

          {(sensors || showEmpty) && (
            <PanelCard
              icon={<Compass className="h-4 w-4" />}
              title="IMU"
              age={freshness(sensors?.received_at, serverTime)}
              className="lg:col-span-2 xl:col-span-2"
            >
              {sensors ? (
                <div className="grid grid-cols-1 gap-2 font-mono text-xs sm:grid-cols-3">
                  <ImuTriple label="accel" v={sensors.linear_acceleration} />
                  <ImuTriple label="gyro" v={sensors.angular_velocity} />
                  <ImuTriple label="mag" v={sensors.magnetic_field} />
                </div>
              ) : (
                <Empty />
              )}
            </PanelCard>
          )}
        </div>
      </section>
    </div>
  );
}

function PanelCard({
  icon,
  title,
  age,
  badge,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  age: { label: string; stale: boolean };
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="text-(--color-muted-foreground)">{icon}</span>
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {badge}
            <span
              className={`text-[10px] uppercase tracking-wider tabular-nums ${
                age.stale ? "text-red-500" : "text-(--color-muted-foreground)"
              }`}
            >
              {age.label}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function getFanStatus(sensors: Sensors): {
  label: string;
  variant: "success" | "warning" | "error";
} {
  const max = Math.max(
    sensors.fan_speed_0,
    sensors.fan_speed_1,
    sensors.fan_speed_2,
    sensors.fan_speed_3,
  );
  if (max >= 80) return { label: "High", variant: "error" };
  if (max >= 50) return { label: "Moderate", variant: "warning" };
  return { label: "Normal", variant: "success" };
}

function fanColor(percent: number): string {
  if (percent >= 80) return "#ef4444";
  if (percent >= 50) return "#f59e0b";
  return "#10b981";
}

function fanTrackColor(percent: number): string {
  if (percent >= 80) return "rgba(239,68,68,0.15)";
  if (percent >= 50) return "rgba(245,158,11,0.15)";
  return "rgba(16,185,129,0.15)";
}

function FanGauge({ label, percent }: { label: string; percent: number }) {
  const radius = 44;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const clamped = Math.min(Math.max(percent, 0), 100);
  const fillLength = arcLength * (clamped / 100);
  const color = fanColor(percent);
  const trackColor = fanTrackColor(percent);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <title>{`${label} fan speed ${percent}%`}</title>
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform="rotate(135 55 55)"
        />
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${fillLength} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform="rotate(135 55 55)"
          style={{ transition: "stroke-dasharray 0.4s ease, stroke 0.4s ease" }}
        />
        <text
          x="55"
          y="51"
          textAnchor="middle"
          fill={color}
          fontSize="18"
          fontWeight="700"
          fontFamily="monospace"
          style={{ transition: "fill 0.4s ease" }}
        >
          {Math.round(percent)}
        </text>
        <text
          x="55"
          y="64"
          textAnchor="middle"
          fill="currentColor"
          className="text-(--color-muted-foreground)"
          fontSize="9"
          fontFamily="sans-serif"
        >
          %
        </text>
      </svg>
      <span className="text-xs font-medium text-(--color-muted-foreground)">
        {label}
      </span>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-20 items-center justify-center text-xs text-(--color-muted-foreground)">
      no data
    </div>
  );
}

function PirPill({ label, on }: { label: string; on: boolean }) {
  return (
    <div
      className={`rounded-md px-2 py-1.5 text-center text-xs font-medium ${
        on
          ? "bg-red-500/15 text-red-700"
          : "bg-(--color-secondary) text-(--color-muted-foreground)"
      }`}
    >
      {label}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-(--color-muted-foreground)">
        {label}
      </span>
      <span className="font-mono text-xs tabular-nums text-(--color-foreground)">
        {value}
      </span>
    </div>
  );
}

function SpeedReadout({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-(--color-secondary) px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-(--color-muted-foreground)">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-lg tabular-nums">
        {value.toFixed(2)}
        <span className="ml-1 text-xs text-(--color-muted-foreground)">mph</span>
      </div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-(--color-muted-foreground)">{label}</span>
      <span className="tabular-nums text-(--color-foreground)">{value}</span>
    </div>
  );
}

function ImuTriple({
  label,
  v,
}: {
  label: string;
  v: { x: number; y: number; z: number };
}) {
  return (
    <div className="rounded-lg bg-(--color-secondary) px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-(--color-muted-foreground)">
        {label}
      </div>
      <div className="mt-1 grid grid-cols-3 gap-1 tabular-nums">
        <span>{v.x.toFixed(2)}</span>
        <span>{v.y.toFixed(2)}</span>
        <span>{v.z.toFixed(2)}</span>
      </div>
    </div>
  );
}
