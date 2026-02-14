import { useEffect, useState } from "react";
import {
  subHours,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  format,
} from "date-fns";
import { FilterIcon, XIcon } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { DatePicker } from "./ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import type { AvailableTag } from "@/lib/beaver/tags";
import type { TagFilter } from "@/lib/beaver/event";

interface EventFilterDialogProps {
  type: "channel" | "project";
  projectID?: number;
  channelID?: number;
  currentStartDate: string | null;
  currentEndDate: string | null;
  currentTags: TagFilter[];
  onApplyFilters: (startDate: string | null, endDate: string | null, tags: TagFilter[]) => void;
}

const timePresets = [
  { label: "Last hour", value: "1h" as const, getDates: () => ({ start: subHours(new Date(), 1), end: new Date() }) },
  { label: "Last day", value: "day" as const, getDates: () => ({ start: subDays(new Date(), 1), end: new Date() }) },
  { label: "Last week", value: "week" as const, getDates: () => ({ start: subWeeks(new Date(), 1), end: new Date() }) },
  { label: "Last month", value: "month" as const, getDates: () => ({ start: subMonths(new Date(), 1), end: new Date() }) },
  { label: "Last year", value: "year" as const, getDates: () => ({ start: subYears(new Date(), 1), end: new Date() }) },
];

export default function EventFilterDialog({
  type,
  projectID,
  channelID,
  currentStartDate,
  currentEndDate,
  currentTags,
  onApplyFilters,
}: EventFilterDialogProps) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(
    currentStartDate ? new Date(currentStartDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    currentEndDate ? new Date(currentEndDate) : undefined
  );
  const [tags, setTags] = useState<TagFilter[]>(currentTags);
  const [availableTags, setAvailableTags] = useState<AvailableTag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [selectedTagKey, setSelectedTagKey] = useState<string>("");

  // Sync with URL params when dialog opens
  useEffect(() => {
    if (open) {
      setStartDate(currentStartDate ? new Date(currentStartDate) : undefined);
      setEndDate(currentEndDate ? new Date(currentEndDate) : undefined);
      setTags(currentTags);
      setSelectedTagKey("");
      fetchAvailableTags();
    }
  }, [open, currentStartDate, currentEndDate, currentTags]);

  const fetchAvailableTags = async () => {
    setLoadingTags(true);
    try {
      let endpoint = "/api/tags";
      if (type === "channel" && channelID) {
        endpoint += `/channel/${channelID}`;
      } else if (projectID) {
        endpoint += `/project/${projectID}`;
      } else {
        setLoadingTags(false);
        return;
      }

      const res = await fetch(endpoint);
      const fetchedTags = await res.json();
      setAvailableTags(fetchedTags);
    } catch (err) {
      console.error("Failed to fetch tags:", err);
    } finally {
      setLoadingTags(false);
    }
  };

  const handleTimePresetSelect = (preset: typeof timePresets[number]["value"]) => {
    const presetConfig = timePresets.find((p) => p.value === preset);
    if (presetConfig) {
      const { start, end } = presetConfig.getDates();
      setStartDate(start);
      setEndDate(end);
    }
  };

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setTags([]);
    setSelectedTagKey("");
  };

  const handleApply = () => {
    onApplyFilters(
      startDate ? startDate.toISOString() : null,
      endDate ? endDate.toISOString() : null,
      tags
    );
    setOpen(false);
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const hasActiveFilters = currentStartDate || currentEndDate || currentTags.length > 0;
  const filterCount = (currentStartDate || currentEndDate ? 1 : 0) + currentTags.length;

  // Check if a preset matches current dates
  const getActivePreset = () => {
    if (!startDate || !endDate) return null;
    // Simple check - not exact but good enough for UI feedback
    const now = new Date();
    const diffMs = now.getTime() - startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours <= 1.1) return "1h";
    if (diffHours <= 25) return "day";
    if (diffHours <= 169) return "week";
    if (diffHours <= 745) return "month";
    if (diffHours <= 8785) return "year";
    return null;
  };

  const activePreset = getActivePreset();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FilterIcon className="size-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {filterCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Filter Events</DialogTitle>
          <DialogDescription>
            Filter events by time range and tags
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Time Filter Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Time Range</h4>
            <div className="flex flex-wrap gap-2">
              {timePresets.map((preset) => (
                <Button
                  key={preset.value}
                  variant={activePreset === preset.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTimePresetSelect(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Custom Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">From</label>
                <DatePicker
                  date={startDate}
                  onSelect={setStartDate}
                  placeholder="Start date"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">To</label>
                <DatePicker
                  date={endDate}
                  onSelect={setEndDate}
                  placeholder="End date"
                />
              </div>
            </div>
          </div>

          {/* Tag Filter Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Tags</h4>
            {loadingTags ? (
              <p className="text-sm text-muted-foreground">Loading tags...</p>
            ) : availableTags.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tags available for this {type}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Key dropdown */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Key</label>
                  <Select
                    value={selectedTagKey}
                    onValueChange={(value) => setSelectedTagKey(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select key..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTags.map((tagGroup) => (
                        <SelectItem key={tagGroup.key} value={tagGroup.key}>
                          {tagGroup.key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Value dropdown */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Value</label>
                  <Select
                    value=""
                    disabled={!selectedTagKey}
                    onValueChange={(value) => {
                      if (selectedTagKey && value) {
                        // Add the tag filter if not already present
                        const exists = tags.some(t => t.key === selectedTagKey && t.value === value);
                        if (!exists) {
                          setTags([...tags, { key: selectedTagKey, value }]);
                        }
                        // Reset key selection
                        setSelectedTagKey("");
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={selectedTagKey ? "Select value..." : "Select key first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedTagKey &&
                        availableTags
                          .find((t) => t.key === selectedTagKey)
                          ?.values.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Selected tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {tags.map((tag, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-sm"
                  >
                    {tag.key}: {tag.value}
                    <button
                      onClick={() => removeTag(i)}
                      className="ml-1 rounded hover:bg-secondary-foreground/10"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={clearFilters}>
            Clear All
          </Button>
          <Button onClick={handleApply}>Apply Filters</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
