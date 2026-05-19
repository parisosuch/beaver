import { getDistinctEventObjects, getDistinctEventActions } from "@/lib/beaver/event";

export async function GET({ params, url }: { params: { channelID: string }; url: URL }) {
  const channelId = parseInt(params.channelID);
  const object = url.searchParams.get("object") ?? undefined;

  const [objects, actions] = await Promise.all([
    getDistinctEventObjects({ channelId }),
    getDistinctEventActions({ channelId }, object),
  ]);

  return new Response(JSON.stringify({ objects, actions }), {
    headers: { "Content-Type": "application/json" },
  });
}

export const prerender = false;
