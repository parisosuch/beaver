import { useEffect, useRef, useState } from "react";
import { BookmarkIcon, BookmarkPlusIcon, TrashIcon, CheckIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { navigate } from "astro:transitions/client";

type SavedView = {
  id: number;
  name: string;
  params: string;
};

export default function SavedViewsMenu({
  projectId,
  currentParams,
  basePath,
  hasActiveFilters,
}: {
  projectId: number;
  currentParams: string;
  basePath: string;
  hasActiveFilters: boolean;
}) {
  const [views, setViews] = useState<SavedView[]>([]);
  const [saving, setSaving] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<SavedView | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/saved-views?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setViews(data);
      })
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (showNameInput) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [showNameInput]);

  const handleSave = async () => {
    if (!nameInput.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/saved-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, name: nameInput.trim(), params: currentParams }),
      });
      const data = await res.json();
      if (res.ok) {
        setViews((prev) => [...prev, data]);
        setNameInput("");
        setShowNameInput(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/saved-views/${id}`, { method: "DELETE" });
    setViews((prev) => prev.filter((v) => v.id !== id));
    setConfirmDelete(null);
  };

  const handleApply = (view: SavedView) => {
    const url = view.params ? `${basePath}?${view.params}` : basePath;
    navigate(url);
  };

  return (
    <>
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete view</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{confirmDelete?.name}&rdquo;? This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && handleDelete(confirmDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DropdownMenu
        onOpenChange={(open) => {
          if (!open) setShowNameInput(false);
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <BookmarkIcon className="size-4 mr-2" />
            Views
            {views.length > 0 && (
              <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
                {views.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {views.length > 0 && (
            <>
              <DropdownMenuLabel>Saved views</DropdownMenuLabel>
              {views.map((view) => (
                <DropdownMenuItem
                  key={view.id}
                  className="flex items-center justify-between gap-2 cursor-pointer"
                  onSelect={(e) => {
                    e.preventDefault();
                    handleApply(view);
                  }}
                >
                  <span className="truncate">{view.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(view);
                    }}
                    className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-destructive"
                    aria-label={`Delete ${view.name}`}
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}

          {hasActiveFilters && !showNameInput && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setShowNameInput(true);
              }}
              className="cursor-pointer gap-2"
            >
              <BookmarkPlusIcon className="size-4 shrink-0" />
              Save current filters…
            </DropdownMenuItem>
          )}

          {showNameInput && (
            <div className="px-2 py-1.5 flex gap-1.5">
              <Input
                ref={inputRef}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") setShowNameInput(false);
                }}
                placeholder="View name…"
                className="h-7 text-sm"
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 shrink-0"
                onClick={handleSave}
                disabled={!nameInput.trim() || saving}
              >
                <CheckIcon className="size-4" />
              </Button>
            </div>
          )}

          {!hasActiveFilters && views.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              Apply filters to save a view.
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
