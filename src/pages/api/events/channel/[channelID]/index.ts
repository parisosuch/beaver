import { getChannelEvents } from "@/lib/beaver/event";

// Paginated endpoint
export async function GET({
  params,
  url,
}: {
  params: { channelID: string };
  url: URL;
}) {
  try {
    const { channelID } = params;
    const search = url.searchParams.get("search"); // string

    let limit;
    let beforeId;

    if (url.searchParams.get("limit")) {
      limit = parseInt(url.searchParams.get("limit")!);
    }
    if (url.searchParams.get("beforeId")) {
      beforeId = parseInt(url.searchParams.get("beforeId")!);
    }

    // TODO: validate parameter datatypes

    const events = await getChannelEvents(parseInt(channelID), {
      search,
      limit,
      beforeId,
    });

    return new Response(JSON.stringify(events), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof Error) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error(err);
    return new Response(
      JSON.stringify({ error: "An unkown error has occurred." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
