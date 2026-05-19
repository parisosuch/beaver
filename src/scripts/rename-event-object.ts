import { parseArgs } from "util";
import { db } from "../lib/db/db";
import { events } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import { EVENT_SEGMENT_REGEX, RESERVED_OBJECT } from "../lib/beaver/event";

const { positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
});

const [oldObject, newObject] = positionals;

if (!oldObject || !newObject) {
  console.error("Usage: bun run rename-event-object <old> <new>");
  process.exit(1);
}

if (!EVENT_SEGMENT_REGEX.test(newObject)) {
  console.error(`Invalid object segment "${newObject}". Must match /^[a-z][a-z_]*$/.`);
  process.exit(1);
}

if (newObject === RESERVED_OBJECT) {
  console.error(`"${RESERVED_OBJECT}" is reserved and cannot be used as a new object name.`);
  process.exit(1);
}

const result = await db
  .update(events)
  .set({ eventObject: newObject })
  .where(eq(events.eventObject, oldObject))
  .returning({ id: events.id });

console.log(`Renamed event_object "${oldObject}" → "${newObject}" on ${result.length} events.`);
process.exit(0);
