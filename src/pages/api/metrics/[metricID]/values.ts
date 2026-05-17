import { getMetricValues } from "@/lib/beaver/metric";
import type { APIContext, APIRoute } from "astro";

export const GET: APIRoute = async ({ params, request }: APIContext) => {
  try {
    const metricId = parseInt(params.metricID!);
    if (isNaN(metricId)) return json({ error: "Invalid metricID." }, 400);

    const url = new URL(request.url);
    const fromStr = url.searchParams.get("from");
    const toStr = url.searchParams.get("to");
    const limitStr = url.searchParams.get("limit");

    const from = fromStr ? new Date(fromStr) : undefined;
    const to = toStr ? new Date(toStr) : undefined;
    const limit = limitStr ? parseInt(limitStr) : undefined;

    const values = await getMetricValues(metricId, { from, to, limit });
    return json(values);
  } catch (err) {
    return handleError(err);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function handleError(err: unknown) {
  if (err instanceof Error) return json({ error: err.message }, 400);
  return json({ error: "An unknown error has occurred." }, 500);
}

export const prerender = false;
