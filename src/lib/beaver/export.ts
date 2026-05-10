import JSZip from "jszip";
import type { EventWithChannelName, TagFilter, SortField, SortOrder } from "./event";

export type ExportFormat = "json" | "csv";

export function parseExportOptions(url: URL) {
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  let tags: TagFilter[] = [];

  if (url.searchParams.get("startDate")) startDate = new Date(url.searchParams.get("startDate")!);
  if (url.searchParams.get("endDate")) endDate = new Date(url.searchParams.get("endDate")!);
  if (url.searchParams.get("tags")) {
    try { tags = JSON.parse(url.searchParams.get("tags")!); } catch {}
  }

  return {
    search: url.searchParams.get("search"),
    startDate,
    endDate,
    tags,
    sortBy: (url.searchParams.get("sortBy") ?? undefined) as SortField | undefined,
    sortOrder: (url.searchParams.get("sortOrder") ?? undefined) as SortOrder | undefined,
  };
}

type ExportEvent = Omit<EventWithChannelName, "read">;

function toExportShape(events: EventWithChannelName[]): ExportEvent[] {
  return events.map(({ read: _read, ...rest }) => rest);
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCSV(events: ExportEvent[]): string {
  const header = "id,name,description,icon,channelName,projectId,createdAt,tags";
  const rows = events.map((e) =>
    [
      e.id,
      csvEscape(e.name),
      csvEscape(e.description ?? ""),
      csvEscape(e.icon ?? ""),
      csvEscape(e.channelName),
      e.projectId,
      e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
      csvEscape(JSON.stringify(e.tags)),
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

export async function buildZipResponse(
  events: EventWithChannelName[],
  format: ExportFormat,
  filename: string,
): Promise<Response> {
  const data = toExportShape(events);
  const content = format === "json" ? JSON.stringify(data, null, 2) : toCSV(data);
  const ext = format === "json" ? "json" : "csv";

  const zip = new JSZip();
  zip.file(`${filename}.${ext}`, content);
  const blob = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });

  return new Response(blob, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}.zip"`,
    },
  });
}
