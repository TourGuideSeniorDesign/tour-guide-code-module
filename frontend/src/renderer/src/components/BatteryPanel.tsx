import { Battery, Zap } from "lucide-react";
import type { AutogiroInterfacesBattery } from "../types/ros";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { DataRow, EmptyState, PanelHeader, Section } from "./ui/panel";

interface BatteryPanelProps {
  battery: AutogiroInterfacesBattery | null;
  isConnected: boolean;
}

function percentColor(percent: number): string {
  if (percent >= 50) return "bg-emerald-400";
  if (percent >= 20) return "bg-amber-400";
  return "bg-red-500";
}

function percentBadgeVariant(percent: number): "success" | "warning" | "error" {
  if (percent >= 50) return "success";
  if (percent >= 20) return "warning";
  return "error";
}

export function BatteryPanel({ battery, isConnected }: BatteryPanelProps) {
  return (
    <Card className="flex flex-col">
      <PanelHeader
        icon={<Battery className="h-4 w-4 text-(--color-primary)" />}
        title="Battery"
        badge={
          battery ? (
            <Badge variant={percentBadgeVariant(battery.battery_percent)}>
              {battery.battery_percent.toFixed(1)}%
            </Badge>
          ) : (
            <Badge variant="secondary">No data</Badge>
          )
        }
      />

      <CardContent>
        {battery ? (
          <div className="flex flex-col gap-3">
            {/* Charge bar */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Charge</span>
                <span className="font-mono tabular-nums text-(--color-foreground)">
                  {battery.battery_percent.toFixed(1)}
                  <span className="text-muted-foreground ml-0.5">%</span>
                </span>
              </div>
              <div className="relative h-3 w-full rounded-full bg-(--color-secondary)">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${percentColor(battery.battery_percent)}`}
                  style={{
                    width: `${Math.max(0, Math.min(100, battery.battery_percent))}%`,
                  }}
                />
              </div>
            </div>

            <Section title="Details" icon={<Zap className="h-3 w-3" />}>
              <DataRow
                label="Voltage"
                value={battery.voltage.toFixed(2)}
                unit="V"
              />
              <DataRow
                label="Current"
                value={(battery.current_amps * 1000).toFixed(1)}
                unit="mA"
              />
              <DataRow
                label="Consumed"
                value={battery.consumed_ah.toFixed(4)}
                unit="Ah"
              />
            </Section>
          </div>
        ) : (
          <EmptyState
            isConnected={isConnected}
            topic="/battery_status"
            className="h-24"
          />
        )}
      </CardContent>
    </Card>
  );
}
