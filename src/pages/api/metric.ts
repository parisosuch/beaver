import {
  appendTimeseries,
  getMetricByName,
  getProjectByApiKey,
  incrementCounter,
  setGauge,
} from "@/lib/beaver/metric";
import type { APIContext, APIRoute } from "astro";

export const POST: APIRoute = async ({ request }: APIContext) => {
  const apiKey = request.headers.get("X-API-Key");

  if (!apiKey) {
    return json({ error: "X-API-Key header is required." }, 401);
  }

  try {
    const body = await request.json();
    const { metric: metricName, value, increment, timestamp } = body;

    if (!metricName) {
      return json({ error: "metric is a required field." }, 400);
    }

    const project = await getProjectByApiKey(apiKey);
    if (!project) {
      return json({ error: "Invalid API key." }, 401);
    }

    const metric = await getMetricByName(project.id, metricName);
    if (!metric) {
      return json(
        { error: `Metric "${metricName}" does not exist. Create it in the dashboard first.` },
        404,
      );
    }

    const ts = timestamp ? new Date(timestamp) : undefined;

    if (metric.type === "gauge") {
      if (value === undefined || value === null) {
        return json({ error: "value is required for gauge metrics." }, 400);
      }
      if (typeof value !== "number") {
        return json({ error: "value must be a number." }, 400);
      }
      await setGauge(metric.id, value);
      return json({ ok: true, metric: metricName, value });
    }

    if (metric.type === "counter") {
      if (increment === undefined || increment === null) {
        return json({ error: "increment is required for counter metrics." }, 400);
      }
      if (typeof increment !== "number") {
        return json({ error: "increment must be a number." }, 400);
      }
      const total = await incrementCounter(metric.id, increment);
      return json({ ok: true, metric: metricName, total });
    }

    if (metric.type === "timeseries") {
      if (value === undefined || value === null) {
        return json({ error: "value is required for timeseries metrics." }, 400);
      }
      if (typeof value !== "number") {
        return json({ error: "value must be a number." }, 400);
      }
      await appendTimeseries(metric.id, value, ts);
      return json({ ok: true, metric: metricName, value, timestamp: (ts ?? new Date()).toISOString() });
    }

    return json({ error: "Unknown metric type." }, 500);
  } catch (err) {
    if (err instanceof Error) {
      return json({ error: err.message }, 500);
    }
    return json({ error: "An unknown error has occurred." }, 500);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const prerender = false;
