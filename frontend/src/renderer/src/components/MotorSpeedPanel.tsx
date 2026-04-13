import { Gauge } from "lucide-react";
import type { AutogiroInterfacesMotors } from "../types/ros";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { EmptyState, PanelHeader } from "./ui/panel";

interface MotorSpeedPanelProps {
  motorSpeed: AutogiroInterfacesMotors | null;
  isConnected: boolean;
}

interface SpeedDisplayProps {
  label: string;
  mph: number;
}

function SpeedDisplay({ label, mph }: SpeedDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-(--color-secondary) px-4 py-3">
      <span className="text-xs text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span className="font-mono text-2xl font-bold tabular-nums text-(--color-foreground)">
        {mph}
      </span>
      <span className="text-xs text-muted-foreground">mph</span>
    </div>
  );
}

export function MotorSpeedPanel({
  motorSpeed,
  isConnected,
}: MotorSpeedPanelProps) {
  return (
    <Card className="flex flex-col">
      <PanelHeader
        icon={<Gauge className="h-4 w-4 text-(--color-primary)" />}
        title="Motor Speed"
        badge={
          motorSpeed ? (
            <Badge variant="success">Live</Badge>
          ) : (
            <Badge variant="secondary">No data</Badge>
          )
        }
      />

      <CardContent>
        {motorSpeed ? (
          <div className="grid grid-cols-2 gap-3">
            <SpeedDisplay label="Left" mph={motorSpeed.left_mph} />
            <SpeedDisplay label="Right" mph={motorSpeed.right_mph} />
          </div>
        ) : (
          <EmptyState
            isConnected={isConnected}
            topic="/motor_speed"
            className="h-24"
          />
        )}
      </CardContent>
    </Card>
  );
}
