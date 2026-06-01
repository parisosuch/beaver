import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";

const TWEEN_MS = 600;

function useTweenedNumber(target: number | null): number | null {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) {
      setDisplay(null);
      fromRef.current = null;
      return;
    }
    const from = fromRef.current ?? target;
    if (from === target) {
      setDisplay(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / TWEEN_MS);
      setDisplay(from + (target - from) * (1 - (1 - t) ** 3));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target]);

  return display;
}

function fmt(value: number | null, unit?: string | null): string {
  if (value === null) return "—";
  const s = Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return unit ? `${s} ${unit}` : s;
}

export default function MetricTweenValue({
  metricId,
  initialValue,
  initialUpdatedAt,
  unit,
  showUpdatedAt,
}: {
  metricId: number;
  initialValue: number | null;
  initialUpdatedAt: string | null;
  unit: string | null;
  showUpdatedAt: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const tweened = useTweenedNumber(value);

  useEffect(() => {
    const handler = (e: Event) => {
      const metrics = (
        e as CustomEvent<{
          metrics: Array<{ id: number; currentValue: number | null; lastUpdatedAt: string | null }>;
        }>
      ).detail.metrics;
      const m = metrics.find((m) => m.id === metricId);
      if (m) {
        setValue(m.currentValue);
        setUpdatedAt(m.lastUpdatedAt);
      }
    };
    window.addEventListener("metrics:updated", handler);
    return () => window.removeEventListener("metrics:updated", handler);
  }, [metricId]);

  return (
    <>
      <p className="text-2xl font-semibold tabular-nums">{fmt(tweened, unit)}</p>
      {showUpdatedAt && updatedAt && (
        <p className="text-xs text-muted-foreground mt-1">
          Updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
        </p>
      )}
    </>
  );
}
