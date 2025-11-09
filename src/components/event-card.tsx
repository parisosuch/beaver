import type { Event } from "@/lib/beaver/event";
import { Card, CardDescription, CardTitle } from "./ui/card";

export default function EventCard({ event }: { event: Event }) {
  return (
    <Card className="p-8">
      <CardTitle className="flex text-lg items-center space-x-4">
        <div className="bg-gray-100 p-2 rounded-md">
          {event.icon ? `${event.icon} ` : "🪵"}
        </div>
        <h2>{event.name}</h2>
      </CardTitle>
      {event.description ? (
        <CardDescription>{event.description}</CardDescription>
      ) : null}
    </Card>
  );
}
