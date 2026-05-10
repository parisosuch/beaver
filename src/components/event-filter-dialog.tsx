import { useEffect, useState } from "react";
import {
  subHours,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import { FilterIcon, PlusIcon, XIcon } from "lucide-react";
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
import { Input } from "./ui/input";
import type { AvailableTag } from "@/lib/beaver/tags";
import type { TagFilter } from "@/lib/beaver/event";

interface EventFilterDialogProps {
  type: "channel" | "project";
  projectID?: number;
  channelID?: number;
  currentStartDate: string | null;
  currentEndDate: string | null;
  currentTags: TagFilter[];
  onApplyFilters: (
    startDate: string | null,
    endDate: string | null,
    tags: TagFilter[],
  ) => void;
}

const timePresets = [
  {
    label: "Last hour",
    value: "1h" as const,
    getDates: () => ({ start: subHours(new Date(), 1), end: new Date() }),
  },
  {
    label: "Today",
    value: "day" as const,
    getDates: () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }),
  },
  {
    label: "This week",
    value: "week" as const,
    getDates: () => ({ start: startOfWeek(new Date()), end: endOfWeek(new Date()) }),
  },
  {
    label: "This month",
    value: "month" as const,
    getDates: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }),
  },
  {
    label: "This year",
    value: "year" as const,
    getDates: () => ({ start: startOfYear(new Date()), end: endOfYear(new Date()) }),
  },
];

const numericOperators = [
  { value: "eq", label: "=" },
  { value: "gt", label: ">" },
  { value: "lt", label: "<" },
  { value: "between", label: "between" },
] as const;

function tagFilterLabel(tag: TagFilter): string {
  if (tag.type === "number") {
    const op = tag.operator ?? "eq";
    if (op === "between") return `${tag.key}: ${tag.value} – ${tag.value2}`;
    const sym = op === "gt" ? ">" : op === "lt" ? "<" : "=";
    return `${tag.key} ${sym} ${tag.value}`;
  }
  return `${tag.key}: ${tag.value}`;
}

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
    currentStartDate ? new Date(currentStartDate) : undefined,
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    currentEndDate ? new Date(currentEndDate) : undefined,
  );
  const [tags, setTags] = useState<TagFilter[]>(currentTags);
  const [availableTags, setAvailableTags] = useState<AvailableTag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  // Tag input state
  const [selectedKey, setSelectedKey] = useState("");
  const [numericOperator, setNumericOperator] = useState<
    "eq" | "gt" | "lt" | "between"
  >("eq");
  const [valueInput, setValueInput] = useState("");
  const [value2Input, setValue2Input] = useState("");

  const selectedTag = availableTags.find((t) => t.key === selectedKey);

  const resetTagInput = () => {
    setSelectedKey("");
    setNumericOperator("eq");
    setValueInput("");
    setValue2Input("");
  };

  // Sync with URL params when dialog opens
  useEffect(() => {
    if (open) {
      setStartDate(currentStartDate ? new Date(currentStartDate) : undefined);
      setEndDate(currentEndDate ? new Date(currentEndDate) : undefined);
      setTags(currentTags);
      resetTagInput();
      fetchAvailableTags();
    }
  }, [open, currentStartDate, currentEndDate, currentTags]);

  // Reset value inputs when key changes
  useEffect(() => {
    setNumericOperator("eq");
    setValueInput("");
    setValue2Input("");
  }, [selectedKey]);

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

  const handleTimePresetSelect = (
    preset: (typeof timePresets)[number]["value"],
  ) => {
    const presetConfig = timePresets.find((p) => p.value === preset);
    if (presetConfig) {
      const { start, end } = presetConfig.getDates();
      setStartDate(start);
      setEndDate(end);
    }
  };

  const addTag = (filter: TagFilter) => {
    const duplicate = tags.some(
      (t) =>
        t.key === filter.key &&
        t.value === filter.value &&
        t.type === filter.type &&
        (t as any).operator === (filter as any).operator,
    );
    if (!duplicate) setTags((prev) => [...prev, filter]);
    resetTagInput();
  };

  // Auto-add for dropdown-based types (string with values, boolean)
  const handleDropdownValueSelect = (value: string) => {
    if (!selectedTag) return;
    addTag({ key: selectedKey, type: selectedTag.type, value });
  };

  // Add for number or free-text string
  const handleAddClick = () => {
    if (!selectedTag || !valueInput.trim()) return;
    if (selectedTag.type === "number") {
      if (numericOperator === "between" && !value2Input.trim()) return;
      addTag({
        key: selectedKey,
        type: "number",
        operator: numericOperator,
        value: valueInput.trim(),
        ...(numericOperator === "between"
          ? { value2: value2Input.trim() }
          : {}),
      });
    } else {
      addTag({
        key: selectedKey,
        type: selectedTag.type,
        value: valueInput.trim(),
      });
    }
  };

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setTags([]);
    resetTagInput();
  };

  const handleApply = () => {
    onApplyFilters(
      startDate ? startDate.toISOString() : null,
      endDate ? endDate.toISOString() : null,
      tags,
    );
    setOpen(false);
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const hasActiveFilters =
    currentStartDate || currentEndDate || currentTags.length > 0;
  const filterCount =
    (currentStartDate || currentEndDate ? 1 : 0) + currentTags.length;

  const getActivePreset = () => {
    if (!startDate || !endDate) return null;
    for (const preset of timePresets) {
      const { start, end } = preset.getDates();
      if (
        Math.abs(startDate.getTime() - start.getTime()) < 60_000 &&
        Math.abs(endDate.getTime() - end.getTime()) < 60_000
      ) {
        return preset.value;
      }
    }
    return null;
  };

  const activePreset = getActivePreset();

  const canAddNumeric =
    selectedTag?.type === "number" &&
    valueInput.trim() !== "" &&
    (numericOperator !== "between" || value2Input.trim() !== "");

  const canAddFreeText =
    selectedTag?.type === "string" &&
    selectedTag.values.length === 0 &&
    valueInput.trim() !== "";

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
                  variant={
                    activePreset === preset.value ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => handleTimePresetSelect(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
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
              <div className="space-y-3">
                {/* Key selector */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Key</label>
                  <Select value={selectedKey} onValueChange={setSelectedKey}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select key..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTags.map((tag) => (
                        <SelectItem key={tag.key} value={tag.key}>
                          <span>{tag.key}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {tag.type}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Value input — varies by type */}
                {selectedTag?.type === "boolean" && (
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">
                      Value
                    </label>
                    <Select value="" onValueChange={handleDropdownValueSelect}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select value..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">true</SelectItem>
                        <SelectItem value="false">false</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedTag?.type === "string" &&
                  selectedTag.values.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">
                        Value
                      </label>
                      <Select
                        value=""
                        onValueChange={handleDropdownValueSelect}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select value..." />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedTag.values.map((v) => (
                            <SelectItem key={v} value={v}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                {selectedTag?.type === "string" &&
                  selectedTag.values.length === 0 && (
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-2">
                        <label className="text-sm text-muted-foreground">
                          Value
                        </label>
                        <Input
                          placeholder="Enter value..."
                          value={valueInput}
                          onChange={(e) => setValueInput(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleAddClick()
                          }
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          size="sm"
                          onClick={handleAddClick}
                          disabled={!canAddFreeText}
                        >
                          <PlusIcon className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                {selectedTag?.type === "number" && (
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">
                      Condition
                    </label>
                    <div className="flex gap-2">
                      <Select
                        value={numericOperator}
                        onValueChange={(v) =>
                          setNumericOperator(v as typeof numericOperator)
                        }
                      >
                        <SelectTrigger className="w-32 shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {numericOperators.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Value"
                        value={valueInput}
                        onChange={(e) => setValueInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddClick()}
                      />
                      {numericOperator === "between" && (
                        <Input
                          type="number"
                          placeholder="To"
                          value={value2Input}
                          onChange={(e) => setValue2Input(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleAddClick()
                          }
                        />
                      )}
                      <Button
                        size="sm"
                        className="shrink-0"
                        onClick={handleAddClick}
                        disabled={!canAddNumeric}
                      >
                        <PlusIcon className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
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
                    {tagFilterLabel(tag)}
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
