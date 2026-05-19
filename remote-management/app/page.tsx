"use client";

import { useEffect, useState } from "react";

type Status = {
  id: number;
  battery_level: number;
  battery_voltage: number;
  state: string;
  latitude: number | null;
  longitude: number | null;
  timestamp: string;
};

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

const stateColor: Record<string, string> = {
  idle: "bg-gray-200 text-gray-800",
  running: "bg-green-200 text-green-800",
  charging: "bg-blue-200 text-blue-800",
  error: "bg-red-200 text-red-800",
};

function freshness(received_at: number | undefined, server_time: number) {
  if (received_at == null) return { label: "never", stale: true };
  const age = server_time - received_at;
  if (age < 5) return { label: `${age.toFixed(1)}s ago`, stale: false };
  return { label: `${age.toFixed(0)}s ago`, stale: age > 10 };
}

export default function StatusPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [ros, setRos] = useState<RosState | null>(null);
  const [rosError, setRosError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [statusRes, rosRes] = await Promise.all([
        fetch("/api/status/current", { cache: "no-store" }).then((r) =>
          r.ok ? r.json() : null,
        ),
        fetch("/api/ros", { cache: "no-store" }).then(async (r) => {
          if (r.ok) return (await r.json()) as RosState;
          return { error: (await r.json())?.error ?? "fetch failed" };
        }),
      ]);
      if (cancelled) return;
      setStatus(statusRes);
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

  if (loading) return <div className="text-gray-500">Loading...</div>;

  const battery = ros?.topics.battery;
  const motors = ros?.topics.motor_speed;
  const sensors = ros?.topics.sensors;
  const serverTime = ros?.server_time ?? 0;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-2xl font-bold">Live (ROS)</h1>
        {rosError ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-lg p-4 text-sm">
            ROS bridge unreachable: {rosError}
          </div>
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card title="Battery" age={freshness(battery?.received_at, serverTime)}>
            {battery ? (
              <>
                <div className="text-2xl font-bold">
                  {battery.battery_percent.toFixed(1)}%
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      battery.battery_percent > 20 ? "bg-green-500" : "bg-red-500"
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, battery.battery_percent))}%` }}
                  />
                </div>
                <div className="mt-3 text-xs text-gray-600 space-y-1">
                  <div>{battery.voltage.toFixed(2)} V</div>
                  <div>{battery.current_amps.toFixed(2)} A</div>
                  <div>{battery.consumed_ah.toFixed(2)} Ah used</div>
                </div>
              </>
            ) : (
              <Empty />
            )}
          </Card>
          <Card title="Wheel Speeds" age={freshness(motors?.received_at, serverTime)}>
            {motors ? (
              <div className="text-sm font-mono space-y-1">
                <div>L: {motors.left_mph.toFixed(2)} mph</div>
                <div>R: {motors.right_mph.toFixed(2)} mph</div>
              </div>
            ) : (
              <Empty />
            )}
          </Card>
          <Card title="Ultrasonics (cm)" age={freshness(sensors?.received_at, serverTime)}>
            {sensors ? (
              <div className="text-sm font-mono space-y-1">
                <div>F0: {sensors.ultrasonic_front_0}</div>
                <div>F1: {sensors.ultrasonic_front_1}</div>
                <div>B: {sensors.ultrasonic_back}</div>
                <div>L: {sensors.ultrasonic_left}</div>
                <div>R: {sensors.ultrasonic_right}</div>
              </div>
            ) : (
              <Empty />
            )}
          </Card>
          <Card title="Motion (PIR)" age={freshness(sensors?.received_at, serverTime)}>
            {sensors ? (
              <div className="grid grid-cols-2 gap-1 text-sm">
                <PirPill label="Front" on={sensors.pir_front} />
                <PirPill label="Back" on={sensors.pir_back} />
                <PirPill label="Left" on={sensors.pir_left} />
                <PirPill label="Right" on={sensors.pir_right} />
              </div>
            ) : (
              <Empty />
            )}
          </Card>
          <Card title="Fans (%)" age={freshness(sensors?.received_at, serverTime)}>
            {sensors ? (
              <div className="text-sm font-mono space-y-1">
                <div>0: {sensors.fan_speed_0}</div>
                <div>1: {sensors.fan_speed_1}</div>
                <div>2: {sensors.fan_speed_2}</div>
                <div>3: {sensors.fan_speed_3}</div>
              </div>
            ) : (
              <Empty />
            )}
          </Card>
          <Card title="IMU" age={freshness(sensors?.received_at, serverTime)}>
            {sensors ? (
              <div className="text-xs font-mono space-y-1">
                <div>
                  accel: {sensors.linear_acceleration.x.toFixed(2)},{" "}
                  {sensors.linear_acceleration.y.toFixed(2)},{" "}
                  {sensors.linear_acceleration.z.toFixed(2)}
                </div>
                <div>
                  gyro: {sensors.angular_velocity.x.toFixed(2)},{" "}
                  {sensors.angular_velocity.y.toFixed(2)},{" "}
                  {sensors.angular_velocity.z.toFixed(2)}
                </div>
                <div>
                  mag: {sensors.magnetic_field.x.toFixed(2)},{" "}
                  {sensors.magnetic_field.y.toFixed(2)},{" "}
                  {sensors.magnetic_field.z.toFixed(2)}
                </div>
              </div>
            ) : (
              <Empty />
            )}
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Latest Reported Status</h2>
        {status ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">State</div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  stateColor[status.state] ?? "bg-gray-200"
                }`}
              >
                {status.state}
              </span>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">Battery Level</div>
              <div className="text-2xl font-bold">{status.battery_level.toFixed(1)}%</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">Battery Voltage</div>
              <div className="text-2xl font-bold">{status.battery_voltage.toFixed(2)}V</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">Location</div>
              {status.latitude != null && status.longitude != null ? (
                <div className="text-sm font-mono">
                  {status.latitude.toFixed(6)}, {status.longitude.toFixed(6)}
                </div>
              ) : (
                <div className="text-gray-400">No GPS data</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-gray-500">No status data available</div>
        )}
        {status ? (
          <div className="text-sm text-gray-500">
            Last reported: {new Date(status.timestamp).toLocaleString()}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Card({
  title,
  age,
  children,
}: {
  title: string;
  age: { label: string; stale: boolean };
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-sm text-gray-500">{title}</div>
        <div className={`text-xs ${age.stale ? "text-red-500" : "text-gray-400"}`}>
          {age.label}
        </div>
      </div>
      {children}
    </div>
  );
}

function Empty() {
  return <div className="text-gray-400 text-sm">no data</div>;
}

function PirPill({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium text-center ${
        on ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-600"
      }`}
    >
      {label}
    </span>
  );
}
