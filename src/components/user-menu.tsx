import { useState } from "react";
import { LogOutIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

// The key login-view, onboarding-view and the user context write to.
const TOKEN_STORAGE_KEY = "beaver_tokens";

export default function UserMenu({ userName }: { userName: string }) {
  const [signingOut, setSigningOut] = useState(false);

  const handleSignout = async () => {
    setSigningOut(true);

    let signedOut = false;
    try {
      const res = await fetch("/api/auth/signout", { method: "POST" });
      // A 401 means the refresh token was already invalid, and the route clears
      // the cookie on that path too, so the session is gone either way. Any
      // other failure leaves the cookie live: redirecting to /login would just
      // bounce back into the dashboard via the middleware with nothing said, so
      // stay put and let the user retry.
      signedOut = res.ok || res.status === 401;
    } catch {
      signedOut = false;
    }

    if (!signedOut) {
      toast.error("Could not sign out. You are still signed in.");
      setSigningOut(false);
      return;
    }

    localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.location.replace("/login");
  };

  return (
    <Popover>
      <div className="mt-4 space-y-2">
        <h1 className="text-sm font-mono">User</h1>
        <PopoverTrigger asChild>
          <p className="font-semibold hover:underline hover:cursor-pointer">@{userName}</p>
        </PopoverTrigger>
        <PopoverContent>
          <Button
            className="w-full hover:cursor-pointer"
            variant="secondary"
            onClick={handleSignout}
            disabled={signingOut}
          >
            <LogOutIcon />
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </PopoverContent>
      </div>
    </Popover>
  );
}
