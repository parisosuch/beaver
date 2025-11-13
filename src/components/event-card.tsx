import type { Event, EventWithChannelName } from "@/lib/beaver/event";
import { Card, CardDescription } from "./ui/card";

export default function EventCard({ event }: { event: EventWithChannelName }) {
  return (
    <Card className="p-8">
      <div className="flex items-center space-x-4">
        <div className="bg-gray-100 p-2 rounded-md">
          {event.icon ? `${event.icon} ` : "🪵"}
        </div>
        <div>
          <h2 className="text-lg font-medium">{event.name}</h2>
          <p className="text-sm font-light"># {event.name}</p>
        </div>
      </div>
      {event.description ? (
        <CardDescription>{event.description}</CardDescription>
      ) : null}
    </Card>
  );
}
