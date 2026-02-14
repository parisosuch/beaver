import { getProjectEvents, type TagFilter } from "@/lib/beaver/event";

export async function GET({
  params,
  url,
}: {
  params: { projectID: string };
  url: URL;
}) {
  const { projectID } = params;
  const search = url.searchParams.get("search");

  // Date range params
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  if (url.searchParams.get("startDate")) {
    startDate = new Date(url.searchParams.get("startDate")!);
  }
  if (url.searchParams.get("endDate")) {
    endDate = new Date(url.searchParams.get("endDate")!);
  }

  // Tag filter params
  let tags: TagFilter[] = [];
  if (url.searchParams.get("tags")) {
    try {
      tags = JSON.parse(url.searchParams.get("tags")!);
    } catch (e) {
      // Invalid JSON, ignore
    }
  }

  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
    "Access-Control-Allow-Origin": "*",
  };

  // TODO: handle limits which in this case shouldn't have a limit.
  const stream = new ReadableStream({
    start(controller) {
      async function sendEvents() {
        try {
          var afterId;
          if (url.searchParams.get("afterId")) {
            afterId = parseInt(url.searchParams.get("afterId")!);
          }

          while (true) {
            const events = await getProjectEvents(parseInt(projectID), {
              search,
              afterId,
              startDate,
              endDate,
              tags,
            });

            if (events.length > 0) {
              afterId = events.at(0)!.id;
              controller.enqueue(`data: ${JSON.stringify(events)}\n\n`);
            } else {
              controller.enqueue(`data: ${JSON.stringify([])}\n\n`);
            }

            await new Promise((resolve) => setTimeout(resolve, 10000));
          }
        } catch (err) {
          console.error("Error in SSE stream:", err);
          controller.close();
        }
      }

      sendEvents();
    },
  });

  return new Response(stream, { headers });
}
