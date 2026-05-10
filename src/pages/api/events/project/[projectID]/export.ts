import { exportProjectEvents } from "@/lib/beaver/event";
import { getProject } from "@/lib/beaver/project";
import { parseExportOptions, buildZipResponse, type ExportFormat } from "@/lib/beaver/export";

export async function GET({
  params,
  url,
  locals,
}: {
  params: { projectID: string };
  url: URL;
  locals: App.Locals;
}) {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const format = (url.searchParams.get("format") ?? "json") as ExportFormat;
  if (format !== "json" && format !== "csv") {
    return new Response(JSON.stringify({ error: "format must be json or csv" }), { status: 400 });
  }

  const projectId = parseInt(params.projectID);
  const [project, events] = await Promise.all([
    getProject(projectId),
    exportProjectEvents(projectId, parseExportOptions(url)),
  ]);
  const filename = project ? `${project.name}-events` : `project-${projectId}-events`;
  return buildZipResponse(events, format, filename);
}

export const prerender = false;
