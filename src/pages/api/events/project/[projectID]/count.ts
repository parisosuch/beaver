import { countProjectEvents, type TagFilter } from "@/lib/beaver/event";

export async function GET({ params, url }: { params: { projectID: string }; url: URL }) {
  const projectId = parseInt(params.projectID);
  const title = url.searchParams.get("title");
  const object = url.searchParams.get("object");
  const action = url.searchParams.get("action");
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

  const count = await countProjectEvents(projectId, {
    title,
    object,
    action,
    startDate,
    endDate,
    tags,
  });
  return new Response(JSON.stringify({ count }), {
    headers: { "Content-Type": "application/json" },
  });
}

export const prerender = false;
