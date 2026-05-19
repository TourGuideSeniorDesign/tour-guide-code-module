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

const stateColor: Record<string, string> = {
  idle: "bg-gray-200 text-gray-800",
  running: "bg-green-200 text-green-800",
  charging: "bg-blue-200 text-blue-800",
  error: "bg-red-200 text-red-800",
};

export default function StatusPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/status/current", { cache: "no-store" });
        const data = res.ok ? await res.json() : null;
        if (!cancelled) setStatus(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (!status) return <div className="text-gray-500">No status data available</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Robot Status</h1>
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
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                status.battery_level > 20 ? "bg-green-500" : "bg-red-500"
              }`}
              style={{ width: `${status.battery_level}%` }}
            />
          </div>
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
      <div className="text-sm text-gray-500">
        Last updated: {new Date(status.timestamp).toLocaleString()}
      </div>
    </div>
  );
}
