import { useEffect, useId, useState } from "react";
import { Skeleton } from "./skeleton";

type ChartType = "line" | "bar";

function bounds(values: number[]): { min: number; max: number } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? { min: min - 1, max: max + 1 } : { min, max };
}

export function Sparkline({
  data,
  chartType,
}: {
  data: { value: number }[];
  chartType: ChartType;
}) {
  const [mounted, setMounted] = useState(false);
  const gradId = useId();
  useEffect(() => setMounted(true), []);

  if (!mounted) return <Skeleton className="h-16 w-full" />;
  if (data.length === 0) {
    return (
      <div className="h-16 flex items-center justify-center text-xs text-muted-foreground">
        No data yet
      </div>
    );
  }

  const W = 300,
    H = 60;
  const values = data.map((d) => d.value);
  const { min, max } = bounds(values);
  const range = max - min;
  const toY = (v: number) => H - ((v - min) / range) * (H - 4) - 2;

  if (chartType === "bar") {
    const gap = Math.max(1, (W / values.length) * 0.2);
    const barW = Math.max(1, (W - gap * (values.length - 1)) / values.length);
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        {values.map((v, i) => {
          const h = Math.max(2, H - toY(v));
          return (
            <rect
              key={i}
              x={i * (barW + gap)}
              y={H - h}
              width={barW}
              height={h}
              rx={1}
              fill="currentColor"
            />
          );
        })}
      </svg>
    );
  }

  const pts = values.map((v, i) => ({
    x: values.length === 1 ? W / 2 : (i / (values.length - 1)) * W,
    y: toY(v),
  }));
  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${H} L${pts[0].x.toFixed(1)},${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="currentColor" stopOpacity={0.3} />
          <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}
