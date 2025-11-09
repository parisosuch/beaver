import type { Event } from "@/lib/beaver/event";
import { Card, CardTitle } from "./ui/card";

export default function EventCard({ event }: { event: Event }) {
  return (
    <Card>
      <CardTitle>{event.name}</CardTitle>
    </Card>
  );
}
