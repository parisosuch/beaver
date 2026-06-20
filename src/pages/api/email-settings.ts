import type { APIContext, APIRoute } from "astro";
import {
  getEmailSettings,
  updateEmailSettings,
  type EmailProvider,
} from "@/lib/beaver/email-settings";

const VALID_PROVIDERS: EmailProvider[] = ["resend", "smtp"];

function requireAdmin(context: APIContext): Response | null {
  if (!context.locals.user?.isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

export const GET: APIRoute = async (context) => {
  const denied = requireAdmin(context);
  if (denied) return denied;

  const settings = await getEmailSettings();

  return new Response(
    JSON.stringify({
      provider: settings?.provider ?? "resend",
      smtpHost: settings?.smtpHost ?? null,
      smtpPort: settings?.smtpPort ?? null,
      smtpUsername: settings?.smtpUsername ?? null,
      smtpPasswordSet: !!settings?.smtpPassword,
      smtpSecure: settings?.smtpSecure ?? true,
      smtpFromEmail: settings?.smtpFromEmail ?? null,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};

export const PATCH: APIRoute = async (context) => {
  const denied = requireAdmin(context);
  if (denied) return denied;

  try {
    const body = await context.request.json();
    const { provider, smtpHost, smtpPort, smtpUsername, smtpPassword, smtpSecure, smtpFromEmail } =
      body;

    if (!VALID_PROVIDERS.includes(provider)) {
      return new Response(JSON.stringify({ error: "Invalid provider." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (provider === "smtp") {
      if (typeof smtpHost !== "string" || !smtpHost.trim()) {
        return new Response(JSON.stringify({ error: "SMTP host is required." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (!Number.isInteger(smtpPort) || smtpPort <= 0 || smtpPort > 65535) {
        return new Response(JSON.stringify({ error: "SMTP port must be a valid port number." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const updated = await updateEmailSettings({
      provider,
      smtpHost: provider === "smtp" ? smtpHost.trim() : null,
      smtpPort: provider === "smtp" ? smtpPort : null,
      smtpUsername: typeof smtpUsername === "string" ? smtpUsername.trim() || null : null,
      ...(typeof smtpPassword === "string" && smtpPassword.length > 0 ? { smtpPassword } : {}),
      smtpSecure: !!smtpSecure,
      smtpFromEmail: typeof smtpFromEmail === "string" ? smtpFromEmail.trim() || null : null,
    });

    return new Response(
      JSON.stringify({
        provider: updated.provider,
        smtpHost: updated.smtpHost,
        smtpPort: updated.smtpPort,
        smtpUsername: updated.smtpUsername,
        smtpPasswordSet: !!updated.smtpPassword,
        smtpSecure: updated.smtpSecure,
        smtpFromEmail: updated.smtpFromEmail,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(JSON.stringify({ error: "Failed to update email settings." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const prerender = false;
