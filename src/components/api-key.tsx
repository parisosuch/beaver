import type { Project } from "@/lib/beaver/project";
import { CheckIcon, ClipboardIcon, RefreshCwIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

const CONFIRM_PHRASE = "rotate api key";

export default function APIKey({ project }: { project: Project }) {
  const [apiKey, setApiKey] = useState(project.apiKey);
  const [copied, setCopied] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState("");

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRotate = async () => {
    setRotating(true);
    setError("");
    try {
      const res = await fetch("/api/project", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectID: project.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to rotate API key.");
        return;
      }
      setApiKey(data.apiKey);
      setRotateOpen(false);
      setConfirmText("");
    } finally {
      setRotating(false);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-2 min-w-0 max-w-full">
        <div className="border px-3 py-1.5 rounded flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <p className="font-mono text-sm truncate min-w-0">{apiKey}</p>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleCopy}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? <CheckIcon size={14} /> : <ClipboardIcon size={14} />}
              </button>
            </TooltipTrigger>
            <TooltipContent>{copied ? "Copied!" : "Copy"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setRotateOpen(true)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCwIcon size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Rotate API key</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Dialog
        open={rotateOpen}
        onOpenChange={(open) => {
          setRotateOpen(open);
          if (!open) {
            setConfirmText("");
            setError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rotate API key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              This will immediately invalidate your current API key. Any integrations using the old
              key will stop working until updated.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Type{" "}
                <span className="font-mono text-foreground bg-muted px-2 py-1 rounded text-xs">
                  {CONFIRM_PHRASE}
                </span>{" "}
                to confirm
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRM_PHRASE}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && confirmText === CONFIRM_PHRASE && !rotating) {
                    handleRotate();
                  }
                }}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRotateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRotate}
              disabled={confirmText !== CONFIRM_PHRASE || rotating}
            >
              {rotating ? "Rotating…" : "Rotate key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
