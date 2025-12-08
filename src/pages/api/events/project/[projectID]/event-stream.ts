import { getProjectEvents } from "@/lib/beaver/event";

export async function GET({
  params,
  url,
}: {
  params: { projectID: string };
  url: URL;
}) {
  const { projectID } = params;
  const search = url.searchParams.get("search");

  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  };

  const stream = new ReadableStream({
    start(controller) {
      async function sendEvents() {
        try {
          var afterId;
          while (true) {
            const events = await getProjectEvents(parseInt(projectID), {
              search,
              afterId,
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
