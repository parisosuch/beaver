import { getProjectEvents } from "@/lib/beaver/event";
import { streamEvents, parseStreamFilter } from "@/lib/beaver/event-stream";

export async function GET({ params, url }: { params: { projectID: string }; url: URL }) {
  const projectId = parseInt(params.projectID);
  const filter = parseStreamFilter(url);

  let afterId: number | undefined;
  if (url.searchParams.get("afterId")) {
    afterId = parseInt(url.searchParams.get("afterId")!);
  }

  return streamEvents({
    afterId,
    filter,
    matchScope: (msg) => msg.projectId === projectId,
    fetchInitial: (id) => getProjectEvents(projectId, { ...filter, afterId: id }),
  });
}
