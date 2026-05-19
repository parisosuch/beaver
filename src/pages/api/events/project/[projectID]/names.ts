import { getDistinctEventObjects, getDistinctEventActions } from "@/lib/beaver/event";

export async function GET({ params, url }: { params: { projectID: string }; url: URL }) {
  const projectId = parseInt(params.projectID);
  const object = url.searchParams.get("object") ?? undefined;

  const [objects, actions] = await Promise.all([
    getDistinctEventObjects({ projectId }),
    getDistinctEventActions({ projectId }, object),
  ]);

  return new Response(JSON.stringify({ objects, actions }), {
    headers: { "Content-Type": "application/json" },
  });
}

export const prerender = false;
