import { defineMiddleware } from "astro:middleware";
import { getAdminUsers } from "./lib/beaver/user";
import { verifyToken } from "./lib/auth/jwt";
import { getSessionByToken } from "./lib/auth/session";
import { getProjects } from "./lib/beaver/project";
import { initDB } from "./lib/db/init";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/onboarding"];

// API routes that don't require authentication
const PUBLIC_API_ROUTES = ["/api/auth/", "/api/event", "/api/admin"];

// Routes that authed users should be redirected away from
const AUTH_REDIRECT_ROUTES = ["/login", "/onboarding"];

let dbInitialized = false;

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

async function getAuthedRedirect(context: Parameters<Parameters<typeof defineMiddleware>[0]>[0]): Promise<string | null> {
  const refreshToken = context.cookies.get("refresh_token")?.value;
  if (!refreshToken) return null;

  const payload = await verifyToken(refreshToken);
  if (!payload) return null;

  const session = await getSessionByToken(refreshToken);
  if (!session || new Date(session.expiresAt) < new Date()) return null;

  const projects = await getProjects();
  if (projects.length > 0) {
    return `/dashboard/${projects[0].id}/feed`;
  }

  return null;
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
  const { pathname } = context.url;

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
    return next();
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
  };

  const response = await next();

  // Prevent caching of protected pages to ensure auth is checked on every request
  // This is important when using View Transitions/prefetching
  response.headers.set("Cache-Control", "no-store, must-revalidate");

  return response;
});
