"use client";

import { useState } from "react";
import { LogOutIcon } from "lucide-react";
import { Button } from "./ui/button";

const TOKEN_STORAGE_KEY = "beaver_tokens";

// Sign-out and password controls for /no-projects. That page renders outside
// layout.astro, so it has no side panel and no UserMenu — without this island a
// user who belongs to no projects has no way out of the page.
export default function NoProjectsActions() {
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignout = async () => {
    setError(null);
    setSigningOut(true);

    try {
      const res = await fetch("/api/auth/signout", { method: "POST" });
      if (!res.ok) {
        // The session cookie is still live, so redirecting to /login would just
        // bounce back here via the middleware with nothing said. Stay put and
        // let the user retry.
        setError("Could not sign out. Please try again.");
        setSigningOut(false);
        return;
      }
    } catch {
      setError("Could not sign out. Please try again.");
      setSigningOut(false);
      return;
    }

    localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.location.replace("/login");
  };

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="secondary" onClick={handleSignout} disabled={signingOut}>
          <LogOutIcon />
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
        <Button variant="outline" asChild>
          <a href="/change-password">Change password</a>
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
