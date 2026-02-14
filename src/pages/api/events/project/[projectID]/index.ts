import { getProjectEvents, type TagFilter, type SortField, type SortOrder } from "@/lib/beaver/event";

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
    if (url.searchParams.get("beforeId")) {
      beforeId = parseInt(url.searchParams.get("beforeId")!);
    }

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

    let offset;
    if (url.searchParams.get("offset")) {
      offset = parseInt(url.searchParams.get("offset")!);
    }

    const sortBy = url.searchParams.get("sortBy") as SortField | null;
    const sortOrder = url.searchParams.get("sortOrder") as SortOrder | null;

    const events = await getProjectEvents(parseInt(projectID), {
      search,
      limit,
      beforeId,
      offset,
      startDate,
      endDate,
      tags,
      sortBy: sortBy ?? undefined,
      sortOrder: sortOrder ?? undefined,
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
