import {
  createMetric,
  deleteMetric,
  getMetrics,
  updateMetric,
} from "@/lib/beaver/metric";
import type { MetricType, ChartType } from "@/lib/beaver/metric";
import type { APIContext, APIRoute } from "astro";

export const GET: APIRoute = async ({ request }: APIContext) => {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");

    if (!projectId) {
      return json({ error: "projectId is a required query parameter." }, 400);
    }

    const metrics = await getMetrics(parseInt(projectId));
    return json(metrics);
  } catch (err) {
    return handleError(err);
  }
};

export const POST: APIRoute = async ({ request }: APIContext) => {
  try {
    const { projectId, name, description, unit, type, chartType } =
      await request.json();

    if (!projectId) return json({ error: "projectId is required." }, 400);
    if (!name) return json({ error: "name is required." }, 400);
    if (!type) return json({ error: "type is required." }, 400);

    const validTypes: MetricType[] = ["gauge", "counter", "timeseries"];
    if (!validTypes.includes(type)) {
      return json({ error: "type must be gauge, counter, or timeseries." }, 400);
    }

    if (chartType !== undefined) {
      const validChartTypes: ChartType[] = ["line", "bar"];
      if (!validChartTypes.includes(chartType)) {
        return json({ error: "chartType must be line or bar." }, 400);
      }
    }

    const metric = await createMetric(parseInt(projectId), {
      name: name.trim(),
      description: description?.trim() || undefined,
      unit: unit?.trim() || undefined,
      type,
      chartType: type === "timeseries" ? chartType : undefined,
    });

    return json(metric);
  } catch (err) {
    return handleError(err);
  }
};

export const PUT: APIRoute = async ({ request }: APIContext) => {
  try {
    const { metricId, name, description, unit } = await request.json();

    if (!metricId) return json({ error: "metricId is required." }, 400);

    const metric = await updateMetric(parseInt(metricId), {
      name: name?.trim() || undefined,
      description: description?.trim() || undefined,
      unit: unit?.trim() || undefined,
    });

    return json(metric);
  } catch (err) {
    return handleError(err);
  }
};

export const DELETE: APIRoute = async ({ request }: APIContext) => {
  try {
    const { metricId } = await request.json();

    if (!metricId) return json({ error: "metricId is required." }, 400);

    await deleteMetric(parseInt(metricId));
    return json({ ok: true });
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
  if (err instanceof Error) {
    return json({ error: err.message }, 400);
  }
  return json({ error: "An unknown error has occurred." }, 500);
}

export const prerender = false;
