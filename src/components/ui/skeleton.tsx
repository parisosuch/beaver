import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-accent", className)}
      {...props}
    />
  );
}

// Title widths cycle so a column of placeholder rows reads as a list of events
// rather than a striped block.
const titleWidths = ["w-2/3", "w-5/12", "w-3/4", "w-1/2", "w-7/12"];

// Placeholder shaped like an EventCard row: timestamp gutter, the node on the
// rule, then the title and meta lines. It lives here so both feeds share one
// definition instead of each hand-rolling pulsing divs.
function EventRowSkeleton({ index = 0, compact = false }: { index?: number; compact?: boolean }) {
  return (
    <div className={cn("flex gap-3 pl-3 pr-4", compact ? "py-1.5" : "py-2")}>
      <Skeleton className="h-5 w-14 shrink-0 md:w-16" />
      <div className="w-3 shrink-0 flex justify-center">
        <Skeleton className={cn("size-2.5 rounded-full", compact ? "mt-[11px]" : "mt-[13px]")} />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className={cn("h-4", titleWidths[index % titleWidths.length])} />
        {!compact && <Skeleton className="h-3 w-1/4" />}
      </div>
    </div>
  );
}

export { Skeleton, EventRowSkeleton };
