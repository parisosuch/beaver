import { defineMiddleware } from "astro:middleware";
import { getAdminUsers } from "./lib/beaver/user";
import { verifyToken } from "./lib/auth/jwt";
import { getSessionByToken } from "./lib/auth/session";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/onboarding"];

// API routes that don't require authentication
const PUBLIC_API_ROUTES = ["/api/auth/", "/api/event", "/api/admin"];

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

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Allow public routes
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

  return next();
});
