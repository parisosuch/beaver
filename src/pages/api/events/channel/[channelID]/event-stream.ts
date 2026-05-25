import { getChannelEvents } from "@/lib/beaver/event";
import { streamEvents, parseStreamFilter } from "@/lib/beaver/event-stream";

export async function GET({ params, url }: { params: { channelID: string }; url: URL }) {
  const channelId = parseInt(params.channelID);
  const filter = parseStreamFilter(url);

  let afterId: number | undefined;
  if (url.searchParams.get("afterId")) {
    afterId = parseInt(url.searchParams.get("afterId")!);
  }

  return streamEvents({
    afterId,
    filter,
    matchScope: (msg) => msg.channelId === channelId,
    fetchInitial: (id) => getChannelEvents(channelId, { ...filter, afterId: id }),
  });
}
