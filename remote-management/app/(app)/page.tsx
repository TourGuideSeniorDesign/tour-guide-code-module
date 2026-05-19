"use client";

import {
  BatteryFull,
  Compass,
  Fan,
  Gauge,
  Radar,
  Radio,
  Signal,
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
          <Badge variant={rosError ? "warning" : "success"}>
            <Signal className="h-3 w-3" />
            {rosError ? "Bridge down" : "Streaming"}
          </Badge>
        </div>
        {rosError && (
          <div className="rounded-lg border border-amber-300/40 bg-amber-100/40 px-4 py-3 text-sm text-amber-900">
            ROS bridge unreachable: {rosError}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

          <PanelCard
            icon={<Fan className="h-4 w-4" />}
            title="Fans (%)"
            age={freshness(sensors?.received_at, serverTime)}
          >
            {sensors ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-xs">
                <DataRow label="Fan 0" value={sensors.fan_speed_0} />
                <DataRow label="Fan 1" value={sensors.fan_speed_1} />
                <DataRow label="Fan 2" value={sensors.fan_speed_2} />
                <DataRow label="Fan 3" value={sensors.fan_speed_3} />
              </div>
            ) : (
              <Empty />
            )}
          </PanelCard>

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
        </div>
      </section>
    </div>
  );
}

function PanelCard({
  icon,
  title,
  age,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  age: { label: string; stale: boolean };
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
          <span
            className={`text-[10px] uppercase tracking-wider tabular-nums ${
              age.stale ? "text-red-500" : "text-(--color-muted-foreground)"
            }`}
          >
            {age.label}
          </span>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
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
