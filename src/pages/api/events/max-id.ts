import { getMaxEventId } from "@/lib/beaver/event";

export async function GET() {
  const maxId = await getMaxEventId();
  return new Response(JSON.stringify({ maxId }), {
    headers: { "Content-Type": "application/json" },
  });
}
