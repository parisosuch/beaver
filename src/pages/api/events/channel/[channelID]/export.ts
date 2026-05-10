import { exportChannelEvents } from "@/lib/beaver/event";
import { getChannel } from "@/lib/beaver/channel";
import { parseExportOptions, buildZipResponse, type ExportFormat } from "@/lib/beaver/export";

export async function GET({
  params,
  url,
  locals,
}: {
  params: { channelID: string };
  url: URL;
  locals: App.Locals;
}) {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const format = (url.searchParams.get("format") ?? "json") as ExportFormat;
  if (format !== "json" && format !== "csv") {
    return new Response(JSON.stringify({ error: "format must be json or csv" }), { status: 400 });
  }

  const channelId = parseInt(params.channelID);
  const [channel, events] = await Promise.all([
    getChannel(channelId),
    exportChannelEvents(channelId, parseExportOptions(url)),
  ]);
  const filename = channel ? `${channel.name}-events` : `channel-${channelId}-events`;
  return buildZipResponse(events, format, filename);
}

export const prerender = false;
