import { getChannelEvents } from "@/lib/beaver/event";

export async function GET({
  params,
  url,
}: {
  params: { channelID: string };
  url: URL;
}) {
  const { channelID } = params;
  const search = url.searchParams.get("search");

  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
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
            const events = await getChannelEvents(parseInt(channelID), {
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
