import { getBookmarkedEvents } from "@/lib/beaver/bookmark";
import type { TagFilter, SortField, SortOrder } from "@/lib/beaver/event";

export async function GET({
  url,
  locals,
}: {
  url: URL;
  locals: App.Locals;
}) {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const projectId = url.searchParams.get("projectId");
  if (!projectId) {
    return new Response(JSON.stringify({ error: "projectId is required" }), { status: 400 });
  }

  const channelId = url.searchParams.get("channelId");
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  let tags: TagFilter[] = [];

  if (url.searchParams.get("startDate")) startDate = new Date(url.searchParams.get("startDate")!);
  if (url.searchParams.get("endDate")) endDate = new Date(url.searchParams.get("endDate")!);
  if (url.searchParams.get("tags")) {
    try { tags = JSON.parse(url.searchParams.get("tags")!); } catch {}
  }

  const events = await getBookmarkedEvents(user.id, parseInt(projectId), {
    search: url.searchParams.get("search"),
    channelId: channelId ? parseInt(channelId) : undefined,
    startDate,
    endDate,
    tags,
    sortBy: (url.searchParams.get("sortBy") ?? undefined) as SortField | undefined,
    sortOrder: (url.searchParams.get("sortOrder") ?? undefined) as SortOrder | undefined,
  });

  return new Response(JSON.stringify(events), {
    headers: { "Content-Type": "application/json" },
  });
}

export const prerender = false;
