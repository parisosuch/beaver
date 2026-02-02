import type { EventWithChannelName } from "@/lib/beaver/event";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/card";
import { Button } from "./ui/button";
import { getEventTime } from "@/lib/utils";
import { ArrowLeftIcon } from "lucide-react";

function TagBadge({
  tagKey,
  value,
}: {
  tagKey: string;
  value: string | number | boolean;
}) {
  const displayValue =
    typeof value === "boolean" ? (value ? "true" : "false") : String(value);

  return (
    <div className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-sm">
      <span className="font-medium text-black/75">{tagKey}</span>
      <span className="text-black/50">=</span>
      <span className="text-black">{displayValue}</span>
    </div>
  );
}

export default function EventDetail({
  event,
}: {
  event: EventWithChannelName;
}) {
  const tags = Object.entries(event.tags);

  return (
    <div className="flex-1 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <a href={`/dashboard/${event.projectId}/feed`}>
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to feed
          </Button>
        </a>
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="bg-gray-100 p-3 rounded-md">
                <p className="text-2xl">{event.icon ? event.icon : "🪵"}</p>
              </div>
              <div>
                <CardTitle className="text-2xl">{event.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <span># {event.channelName}</span>
                  <span className="text-black/40">·</span>
                  <span>{getEventTime(new Date(event.createdAt))}</span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          {event.description && (
            <CardContent>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-black/60">
                  Description
                </h3>
                <p className="text-black/80">{event.description}</p>
              </div>
            </CardContent>
          )}

          {tags.length > 0 && (
            <CardContent>
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-black/60">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map(([key, value]) => (
                    <TagBadge key={key} tagKey={key} value={value} />
                  ))}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
