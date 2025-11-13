import { getProjectEvents } from "@/lib/beaver/event";

export async function GET({ params }: { params: { projectID: string } }) {
  const { projectID } = params;

  const headers = {
    "Content-Type": "text/event-stream", // Essential for SSE
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*", // Allows cross-origin requests, if needed
  };

  const stream = new ReadableStream({
    start(controller) {
      async function sendEvents() {
        try {
          while (true) {
            const events = await getProjectEvents(parseInt(projectID));

            // Send each event to the client
            controller.enqueue(`data: ${JSON.stringify(events)}\n\n`);

            // Wait for 10 seconds before polling for more events
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
