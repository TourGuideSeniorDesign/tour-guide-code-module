import type { ReactNode } from "react";
import { CardHeader, CardTitle } from "./card";

interface PanelHeaderProps {
  icon: ReactNode;
  title: string;
  badge?: ReactNode;
}

export function PanelHeader({ icon, title, badge }: PanelHeaderProps) {
  return (
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        {badge}
      </div>
    </CardHeader>
  );
}

interface EmptyStateProps {
  isConnected: boolean;
  topic: string;
  className?: string;
}

export function EmptyState({
  isConnected,
  topic,
  className = "h-32",
}: EmptyStateProps) {
  return (
    <div
      className={`flex items-center justify-center text-sm text-muted-foreground ${className}`}
    >
      {isConnected
        ? `Waiting for ${topic} messages…`
        : "Connect to rosbridge to receive data"}
    </div>
  );
}

interface DataRowProps {
  label: string;
  value: ReactNode;
  unit?: string;
}

export function DataRow({ label, value, unit }: DataRowProps) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-xs tabular-nums text-(--color-foreground)">
        {value}
        {unit && (
          <span className="ml-0.5 text-muted-foreground">
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

interface SectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}

export function Section({ title, icon, children }: SectionProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="rounded-lg bg-(--color-secondary) px-3 py-2">
        {children}
      </div>
    </div>
  );
}
