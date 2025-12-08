import { getProjectEvents } from "@/lib/beaver/event";

// Paginated endpoint
export async function GET({
  params,
  url,
}: {
  params: { projectID: string };
  url: URL;
}) {
  try {
    const { projectID } = params;
    const search = url.searchParams.get("search"); // string

    let limit;
    let beforeId;

    if (url.searchParams.get("limit")) {
      limit = parseInt(url.searchParams.get("limit")!);
    }
    if (url.searchParams.get("cursor")) {
      beforeId = parseInt(url.searchParams.get("cursor")!);
    }

    // TODO: validate parameter datatypes

    const events = await getProjectEvents(parseInt(projectID), {
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
