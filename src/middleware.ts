import { defineMiddleware } from "astro:middleware";
import { getAdminUsers } from "./lib/beaver/user";
import { verifyToken } from "./lib/auth/jwt";
import { getSessionByToken } from "./lib/auth/session";
import { getProjectsForUser, getUserProjectRole } from "./lib/beaver/project-member";
import { logRequest, logError } from "./lib/logger";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/onboarding", "/api/event", "/api/metric"];

// API routes that don't require authentication (prefix-matched)
const PUBLIC_API_ROUTES = ["/api/auth/", "/api/admin"];

// Routes that authed users should be redirected away from
const AUTH_REDIRECT_ROUTES = ["/login", "/onboarding"];

// Route for forced password change
const CHANGE_PASSWORD_ROUTE = "/change-password";

// Pull the project id out of a path that is scoped to a single project, so the
// middleware can verify membership before the request reaches the page/handler.
// Covers dashboard pages (/dashboard/{id}/...) and project-scoped API routes
// (/api/.../project/{id}/...). Routes that carry the project id in the body or
// query (e.g. /api/project, /api/project-members) authorize themselves.
function extractProjectId(pathname: string): number | null {
  const dashboard = pathname.match(/^\/dashboard\/(\d+)(?:\/|$)/);
  if (dashboard) return parseInt(dashboard[1]);

  if (pathname.startsWith("/api/")) {
    const api = pathname.match(/\/project\/(\d+)(?:\/|$)/);
    if (api) return parseInt(api[1]);
  }

  return null;
}

function isPublicRoute(pathname: string): boolean {
  // Check exact public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return true;
  }

  // Check public API routes (prefix match)
  for (const route of PUBLIC_API_ROUTES) {
    if (pathname.startsWith(route)) {
      return true;
    }
  }

  return false;
}

async function getAuthedRedirect(
  context: Parameters<Parameters<typeof defineMiddleware>[0]>[0],
): Promise<string | null> {
  const refreshToken = context.cookies.get("refresh_token")?.value;
  if (!refreshToken) return null;

  const payload = await verifyToken(refreshToken);
  if (!payload) return null;

  const session = await getSessionByToken(refreshToken);
  if (!session || new Date(session.expiresAt) < new Date()) return null;

  if (payload.isAdmin) {
    const { getProjects } = await import("./lib/beaver/project");
    const projects = await getProjects();
    if (projects.length > 0) return `/dashboard/${projects[0].id}/feed`;
    return "/";
  }

  const projects = await getProjectsForUser(payload.userId);
  if (projects.length > 0) {
    return `/dashboard/${projects[0].id}/feed`;
  }

  // Authenticated but no projects
  if (payload.canCreateProjects) {
    return "/dashboard/create-project";
  }

  return "/no-projects";
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isApi = pathname.startsWith("/api/");

  // Wraps next() with request logging for API routes
  const nextWithLogging = async () => {
    const start = Date.now();
    try {
      const response = await next();
      logRequest(context.request.method, pathname, response.status, Date.now() - start);
      return response;
    } catch (err) {
      logError(context.request.method, pathname, Date.now() - start, err);
      throw err;
    }
  };

  // For login/onboarding, redirect authed users to dashboard
  if (AUTH_REDIRECT_ROUTES.includes(pathname)) {
    const redirect = await getAuthedRedirect(context);
    if (redirect) {
      return context.redirect(redirect);
    }
    return next();
  }

  // Allow other public routes (API routes)
  if (isPublicRoute(pathname)) {
    return isApi ? nextWithLogging() : next();
  }

  // Check if admin user exists
  const adminUsers = await getAdminUsers();
  const hasAdmin = adminUsers.length > 0;

  // If no admin exists, redirect to onboarding
  if (!hasAdmin) {
    return context.redirect("/onboarding");
  }

  // Get refresh token from cookie
  const refreshToken = context.cookies.get("refresh_token")?.value;

  if (!refreshToken) {
    return context.redirect("/login");
  }

  // Verify the token
  const payload = await verifyToken(refreshToken);
  if (!payload) {
    context.cookies.delete("refresh_token", { path: "/" });
    return context.redirect("/login");
  }

  // Check if session exists in database
  const session = await getSessionByToken(refreshToken);
  if (!session) {
    context.cookies.delete("refresh_token", { path: "/" });
    return context.redirect("/login");
  }

  // Check if session has expired
  if (new Date(session.expiresAt) < new Date()) {
    context.cookies.delete("refresh_token", { path: "/" });
    return context.redirect("/login");
  }

  // Store user info in locals for use in pages
  context.locals.user = {
    id: payload.userId,
    userName: payload.userName,
    isAdmin: payload.isAdmin,
    canCreateProjects: payload.canCreateProjects ?? false,
  };

  // If user must change password, redirect to the change-password page
  // (except for API routes and the change-password page itself)
  if (
    payload.mustChangePassword &&
    !pathname.startsWith("/api/") &&
    pathname !== CHANGE_PASSWORD_ROUTE
  ) {
    return context.redirect(CHANGE_PASSWORD_ROUTE);
  }

  // Project-level authorization. Authentication alone is not enough: a user may
  // only access a project they belong to. Admins may access any project. This
  // is enforced centrally here so every project-scoped page and API route is
  // covered, rather than relying on each handler to remember to check.
  const projectId = extractProjectId(pathname);
  if (projectId !== null && !payload.isAdmin) {
    const role = await getUserProjectRole(projectId, payload.userId);
    if (role === null) {
      if (isApi) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
      // Send non-members back to a project they can actually see.
      return context.redirect((await getAuthedRedirect(context)) ?? "/login");
    }
  }

  if (isApi) {
    return nextWithLogging();
  }

  const response = await next();
  // Prevent caching of protected pages to ensure auth is checked on every request
  // This is important when using View Transitions/prefetching
  response.headers.set("Cache-Control", "no-store, must-revalidate");
  return response;
});
