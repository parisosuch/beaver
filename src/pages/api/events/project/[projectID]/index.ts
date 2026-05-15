import {
  getProjectEvents,
  type TagFilter,
  type SortField,
  type SortOrder,
} from "@/lib/beaver/event";

// Paginated endpoint
export async function GET({
  params,
  url,
  locals,
}: {
  params: { projectID: string };
  url: URL;
  locals: App.Locals;
}) {
  try {
    const { projectID } = params;
    const search = url.searchParams.get("search"); // string

    let limit;
    let beforeId;
    let afterId;
    let cursorName: string | undefined;
    let cursorId: number | undefined;

    if (url.searchParams.get("limit")) {
      limit = parseInt(url.searchParams.get("limit")!);
    }
    if (url.searchParams.get("beforeId")) {
      beforeId = parseInt(url.searchParams.get("beforeId")!);
    }
    if (url.searchParams.get("afterId")) {
      afterId = parseInt(url.searchParams.get("afterId")!);
    }
    if (url.searchParams.get("cursorName") && url.searchParams.get("cursorId")) {
      cursorName = url.searchParams.get("cursorName")!;
      cursorId = parseInt(url.searchParams.get("cursorId")!);
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

    const sortBy = url.searchParams.get("sortBy") as SortField | null;
    const sortOrder = url.searchParams.get("sortOrder") as SortOrder | null;

    const events = await getProjectEvents(
      parseInt(projectID),
      {
        search,
        limit,
        beforeId,
        afterId,
        cursorName,
        cursorId,
        startDate,
        endDate,
        tags,
        sortBy: sortBy ?? undefined,
        sortOrder: sortOrder ?? undefined,
      },
      locals.user?.id,
    );

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
    return new Response(JSON.stringify({ error: "An unkown error has occurred." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
