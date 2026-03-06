import { Activity, Radar, Radio, Zap, Compass } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { PanelHeader, EmptyState, DataRow, Section } from './ui/panel'
import type { AutogiroInterfacesSensors } from '../types/ros'

interface SensorsPanelProps {
  sensors: AutogiroInterfacesSensors | null
  isConnected: boolean
}

function PirIndicator({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`h-2.5 w-2.5 rounded-full transition-colors ${active ? 'bg-amber-400 shadow-[0_0_6px_theme(colors.amber.400)]' : 'bg-[var(--color-border)]'}`}
      />
      <span className="text-[10px] text-[var(--color-muted-foreground)]">{label}</span>
    </div>
  )
}

export function SensorsPanel({ sensors, isConnected }: SensorsPanelProps) {
  return (
    <Card className="flex flex-col col-span-full">
      <PanelHeader
        icon={<Activity className="h-4 w-4 text-[var(--color-primary)]" />}
        title="Sensors"
        badge={sensors ? <Badge variant="success">Live</Badge> : <Badge variant="secondary">No data</Badge>}
      />

      <CardContent>
        {sensors ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Section title="Motion" icon={<Zap className="h-3 w-3" />}>
              <DataRow label="Left speed" value={sensors.left_speed} />
              <DataRow label="Right speed" value={sensors.right_speed} />
              <DataRow label="Lateral disp." value={sensors.lat_disp} />
              <DataRow label="Longitudinal disp." value={sensors.long_disp} />
            </Section>

            <Section title="Ultrasonic" icon={<Radar className="h-3 w-3" />}>
              <DataRow label="Front 0" value={sensors.ultrasonic_front_0} unit="cm" />
              <DataRow label="Front 1" value={sensors.ultrasonic_front_1} unit="cm" />
              <DataRow label="Back" value={sensors.ultrasonic_back} unit="cm" />
              <DataRow label="Left" value={sensors.ultrasonic_left} unit="cm" />
              <DataRow label="Right" value={sensors.ultrasonic_right} unit="cm" />
            </Section>

            <Section title="PIR" icon={<Radio className="h-3 w-3" />}>
              <div className="flex items-center justify-around py-1">
                <PirIndicator label="Front" active={sensors.pir_front} />
                <PirIndicator label="Back" active={sensors.pir_back} />
                <PirIndicator label="Left" active={sensors.pir_left} />
                <PirIndicator label="Right" active={sensors.pir_right} />
              </div>
            </Section>

            <Section title="Acceleration" icon={<Activity className="h-3 w-3" />}>
              <DataRow label="X" value={sensors.linear_acceleration_x.toFixed(3)} unit="m/s²" />
              <DataRow label="Y" value={sensors.linear_acceleration_y.toFixed(3)} unit="m/s²" />
              <DataRow label="Z" value={sensors.linear_acceleration_z.toFixed(3)} unit="m/s²" />
            </Section>

            <Section title="Angular Velocity" icon={<Activity className="h-3 w-3" />}>
              <DataRow label="X" value={sensors.angular_velocity_x.toFixed(3)} unit="rad/s" />
              <DataRow label="Y" value={sensors.angular_velocity_y.toFixed(3)} unit="rad/s" />
              <DataRow label="Z" value={sensors.angular_velocity_z.toFixed(3)} unit="rad/s" />
            </Section>

            <Section title="Magnetic Field" icon={<Compass className="h-3 w-3" />}>
              <DataRow label="X" value={sensors.magnetic_field_x.toFixed(3)} unit="µT" />
              <DataRow label="Y" value={sensors.magnetic_field_y.toFixed(3)} unit="µT" />
              <DataRow label="Z" value={sensors.magnetic_field_z.toFixed(3)} unit="µT" />
            </Section>
          </div>
        ) : (
          <EmptyState isConnected={isConnected} topic="/sensors" />
        )}
      </CardContent>
    </Card>
  )
}
