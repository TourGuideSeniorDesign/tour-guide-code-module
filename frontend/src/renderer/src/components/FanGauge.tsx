interface FanGaugeProps {
  label: string;
  percent: number;
}

function getFanColor(percent: number): string {
  if (percent >= 80) return "#ef4444";
  if (percent >= 50) return "#f59e0b";
  return "#10b981";
}

function getFanTrackColor(percent: number): string {
  if (percent >= 80) return "rgba(239,68,68,0.15)";
  if (percent >= 50) return "rgba(245,158,11,0.15)";
  return "rgba(16,185,129,0.15)";
}

export function FanGauge({ label, percent }: FanGaugeProps) {
  const radius = 44;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radius;
  // Arc covers 270 degrees (from 135° to 405°), starting bottom-left
  const arcLength = circumference * 0.75;
  const fillLength = arcLength * (Math.min(Math.max(percent, 0), 100) / 100);
  const color = getFanColor(percent);
  const trackColor = getFanTrackColor(percent);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="110" height="110" viewBox="0 0 110 110">
          <title>{`${label} fan speed ${percent}%`}</title>
          {/* Background track */}
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
          {/* Filled arc */}
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
            style={{
              transition: "stroke-dasharray 0.4s ease, stroke 0.4s ease",
            }}
          />
          {/* Center text */}
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
            {percent}
          </text>
          <text
            x="55"
            y="64"
            textAnchor="middle"
            fill="hsl(240 5% 64.9%)"
            fontSize="9"
            fontFamily="sans-serif"
          >
            %
          </text>
        </svg>
      </div>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
}
