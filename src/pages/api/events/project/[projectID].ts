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
          while (true) {
            const events = await getProjectEvents(parseInt(projectID), {
              search,
            });

            controller.enqueue(`data: ${JSON.stringify(events)}\n\n`);

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
