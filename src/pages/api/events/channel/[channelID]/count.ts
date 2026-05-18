import { countChannelEvents, type TagFilter } from "@/lib/beaver/event";

export async function GET({ params, url }: { params: { channelID: string }; url: URL }) {
  const channelId = parseInt(params.channelID);
  const search = url.searchParams.get("search");
  const startDate = url.searchParams.get("startDate")
    ? new Date(url.searchParams.get("startDate")!)
    : undefined;
  const endDate = url.searchParams.get("endDate")
    ? new Date(url.searchParams.get("endDate")!)
    : undefined;
  let tags: TagFilter[] = [];
  if (url.searchParams.get("tags")) {
    try {
      tags = JSON.parse(url.searchParams.get("tags")!);
    } catch {}
  }

  const count = await countChannelEvents(channelId, { search, startDate, endDate, tags });
  return new Response(JSON.stringify({ count }), {
    headers: { "Content-Type": "application/json" },
  });
}

export const prerender = false;
