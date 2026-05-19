import { parseArgs } from "util";
import { db } from "../lib/db/db";
import { events } from "../lib/db/schema";
import { eq, and } from "drizzle-orm";
import { EVENT_SEGMENT_REGEX } from "../lib/beaver/event";

const { positionals, values } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    object: { type: "string" },
  },
});

const [oldAction, newAction] = positionals;

if (!oldAction || !newAction) {
  console.error("Usage: bun run rename-event-action <old> <new> [--object <obj>]");
  process.exit(1);
}

if (!EVENT_SEGMENT_REGEX.test(newAction)) {
  console.error(`Invalid action segment "${newAction}". Must match /^[a-z][a-z_]*$/.`);
  process.exit(1);
}

const where = values.object
  ? and(eq(events.eventAction, oldAction), eq(events.eventObject, values.object))
  : eq(events.eventAction, oldAction);

const result = await db
  .update(events)
  .set({ eventAction: newAction })
  .where(where)
  .returning({ id: events.id });

const scope = values.object ? ` (scoped to object "${values.object}")` : "";
console.log(
  `Renamed event_action "${oldAction}" → "${newAction}"${scope} on ${result.length} events.`,
);
process.exit(0);
