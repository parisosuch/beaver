import { LogOutIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export default function UserMenu({ userName }: { userName: string }) {
  const handleSignout = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    localStorage.removeItem("beaver:user");
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
          >
            <LogOutIcon />
            Sign out
          </Button>
        </PopoverContent>
      </div>
    </Popover>
  );
}
