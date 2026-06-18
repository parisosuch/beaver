import { db } from "../db/db";
import { events, channels, eventTags, channelReads, bookmarks } from "../db/schema";
import { getEventTags } from "./event-tags";
import { eq, ne, and, or, asc, desc, like, gt, lt, gte, lte, exists, max, sql } from "drizzle-orm";
import { getProject } from "./project";

export const EVENT_NAME_REGEX = /^[a-z][a-z_]*\.[a-z][a-z_]*$/;
export const EVENT_SEGMENT_REGEX = /^[a-z][a-z_]*$/;
export const RESERVED_OBJECT = "legacy";

export async function getMaxEventId(): Promise<number> {
  const result = await db.select({ maxId: max(events.id) }).from(events);
  return result[0]?.maxId ?? 0;
}

export type Tag = {
  id: number;
  eventId: number;
  key: string;
  value: string;
  type: "string" | "number" | "boolean";
};

export type TagPrimitive = Record<string, number | string | boolean>;

export type Event = {
  id: number;
  eventObject: string;
  eventAction: string;
  title: string;
  description?: string;
  icon?: string;
  projectId: number;
  channelId: number;
  createdAt: Date;
};

export type EventWithChannelName = {
  id: number;
  eventObject: string;
  eventAction: string;
  title: string;
  description: string | null;
  icon: string | null;
  projectId: number;
  channelName: string;
  createdAt: Date;
  tags: TagPrimitive;
  read: boolean;
  bookmarked: boolean;
};

export type TagFilter = {
  key: string;
  type: "string" | "number" | "boolean";
  value: string;
  operator?: "eq" | "gt" | "lt" | "between";
  value2?: string;
};

export type SortField = "date" | "name";
export type SortOrder = "asc" | "desc";

type QueryOptions = {
  title?: string | null;
  object?: string | null;
  action?: string | null;
  afterId?: number;
  beforeId?: number;
  cursorObject?: string;
  cursorAction?: string;
  cursorId?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  tags?: TagFilter[];
  sortBy?: SortField;
  sortOrder?: SortOrder;
};

const buildTagCondition = (tagFilter: TagFilter) => {
  const base = [eq(eventTags.eventId, events.id), eq(eventTags.key, tagFilter.key)];

  if (tagFilter.type === "number") {
    const op = tagFilter.operator ?? "eq";
    const v = parseFloat(tagFilter.value);
    if (op === "gt") {
      base.push(sql`CAST(${eventTags.value} AS REAL) > ${v}` as any);
    } else if (op === "lt") {
      base.push(sql`CAST(${eventTags.value} AS REAL) < ${v}` as any);
    } else if (op === "between") {
      const v2 = parseFloat(tagFilter.value2 ?? tagFilter.value);
      base.push(sql`CAST(${eventTags.value} AS REAL) BETWEEN ${v} AND ${v2}` as any);
    } else {
      base.push(sql`CAST(${eventTags.value} AS REAL) = ${v}` as any);
    }
  } else {
    base.push(eq(eventTags.value, tagFilter.value));
  }

  return exists(
    db
      .select({ eventId: eventTags.eventId })
      .from(eventTags)
      .where(and(...base)),
  );
};

function applyFilterConditions(conditions: any[], options: QueryOptions) {
  if (options.title) {
    conditions.push(like(events.title, `%${options.title}%`));
  }
  if (options.object) {
    conditions.push(eq(events.eventObject, options.object));
  }
  if (options.action) {
    conditions.push(eq(events.eventAction, options.action));
  }
  if (options.startDate) conditions.push(gte(events.createdAt, options.startDate));
  if (options.endDate) conditions.push(lte(events.createdAt, options.endDate));
  if (options.tags?.length) {
    for (const tag of options.tags) conditions.push(buildTagCondition(tag));
  }
}

export type StreamFilter = {
  title?: string | null;
  object?: string | null;
  action?: string | null;
  startDate?: Date;
  endDate?: Date;
  tags?: TagFilter[];
};

function tagMatches(tags: TagPrimitive, filter: TagFilter): boolean {
  if (!(filter.key in tags)) return false;
  const raw = tags[filter.key];

  if (filter.type === "number") {
    const n = typeof raw === "number" ? raw : parseFloat(String(raw));
    if (Number.isNaN(n)) return false;
    const v = parseFloat(filter.value);
    const op = filter.operator ?? "eq";
    if (op === "gt") return n > v;
    if (op === "lt") return n < v;
    if (op === "between") return n >= v && n <= parseFloat(filter.value2 ?? filter.value);
    return n === v;
  }

  return String(raw) === filter.value;
}

/**
 * In-process mirror of `applyFilterConditions`, for matching a single event
 * pushed via the event bus against an SSE stream's filters. Must stay in sync
 * with the SQL semantics there (substring title, exact object/action,
 * inclusive date bounds, and tag eq/gt/lt/between).
 */
export function eventMatchesFilters(event: EventWithChannelName, filter: StreamFilter): boolean {
  if (filter.title && !event.title.toLowerCase().includes(filter.title.toLowerCase())) return false;
  if (filter.object && event.eventObject !== filter.object) return false;
  if (filter.action && event.eventAction !== filter.action) return false;

  const createdAt = new Date(event.createdAt).getTime();
  if (filter.startDate && createdAt < filter.startDate.getTime()) return false;
  if (filter.endDate && createdAt > filter.endDate.getTime()) return false;

  if (filter.tags?.length) {
    for (const tag of filter.tags) {
      if (!tagMatches(event.tags, tag)) return false;
    }
  }

  return true;
}

function applyCursorAndPagination(conditions: any[], options: QueryOptions) {
  if (options.afterId) conditions.push(gt(events.id, options.afterId));
  if (options.beforeId) conditions.push(lt(events.id, options.beforeId));

  if (
    options.cursorObject !== undefined &&
    options.cursorAction !== undefined &&
    options.cursorId !== undefined
  ) {
    const isAsc = options.sortOrder === "asc";
    const cmpStrict = isAsc ? gt : lt;
    const cmpStrictId = isAsc ? gt : lt;
    conditions.push(
      or(
        cmpStrict(events.eventObject, options.cursorObject),
        and(
          eq(events.eventObject, options.cursorObject),
          cmpStrict(events.eventAction, options.cursorAction),
        ),
        and(
          eq(events.eventObject, options.cursorObject),
          eq(events.eventAction, options.cursorAction),
          cmpStrictId(events.id, options.cursorId),
        ),
      ),
    );
  }
}

function getOrderBy(options: QueryOptions) {
  const orderFn = options.sortOrder === "asc" ? asc : desc;
  if (options.sortBy === "name") {
    return [orderFn(events.eventObject), orderFn(events.eventAction), orderFn(events.id)];
  }
  return [orderFn(events.createdAt), orderFn(events.id)];
}

export async function getChannelEvents(
  channelId: number,
  options: QueryOptions,
  userId?: number,
): Promise<EventWithChannelName[]> {
  const conditions: any[] = [eq(events.channelId, channelId)];
  applyFilterConditions(conditions, options);
  applyCursorAndPagination(conditions, options);

  const readExpr =
    userId !== undefined
      ? exists(
          db
            .select({ _: sql`1` })
            .from(channelReads)
            .where(
              and(
                eq(channelReads.channelId, events.channelId),
                eq(channelReads.userId, userId),
                gte(channelReads.lastReadAt, events.createdAt),
              ),
            ),
        )
      : sql<boolean>`0`;

  const bookmarkedExpr =
    userId !== undefined
      ? exists(
          db
            .select({ _: sql`1` })
            .from(bookmarks)
            .where(and(eq(bookmarks.eventId, events.id), eq(bookmarks.userId, userId))),
        )
      : sql<boolean>`0`;

  const eventData = await db
    .select({
      id: events.id,
      eventObject: events.eventObject,
      eventAction: events.eventAction,
      title: events.title,
      description: events.description,
      icon: events.icon,
      projectId: events.projectId,
      createdAt: events.createdAt,
      channelName: channels.name,
      read: readExpr,
      bookmarked: bookmarkedExpr,
    })
    .from(events)
    .innerJoin(channels, eq(events.channelId, channels.id))
    .where(and(...conditions))
    .orderBy(...getOrderBy(options))
    .limit(options.limit ?? 100);

  const eventIds = eventData.map((event) => event.id);
  const fetchedTags = await getEventTags(eventIds);

  return eventData.map((event) => ({
    ...event,
    tags: fetchedTags[event.id] || {},
    read: Boolean(event.read),
    bookmarked: Boolean(event.bookmarked),
  }));
}

export async function getProjectEvents(
  projectId: number,
  options: QueryOptions,
  userId?: number,
): Promise<EventWithChannelName[]> {
  const conditions: any[] = [eq(events.projectId, projectId)];
  applyFilterConditions(conditions, options);
  applyCursorAndPagination(conditions, options);

  const readExpr =
    userId !== undefined
      ? exists(
          db
            .select({ _: sql`1` })
            .from(channelReads)
            .where(
              and(
                eq(channelReads.channelId, events.channelId),
                eq(channelReads.userId, userId),
                gte(channelReads.lastReadAt, events.createdAt),
              ),
            ),
        )
      : sql<boolean>`0`;

  const bookmarkedExpr =
    userId !== undefined
      ? exists(
          db
            .select({ _: sql`1` })
            .from(bookmarks)
            .where(and(eq(bookmarks.eventId, events.id), eq(bookmarks.userId, userId))),
        )
      : sql<boolean>`0`;

  const eventData = await db
    .select({
      id: events.id,
      eventObject: events.eventObject,
      eventAction: events.eventAction,
      title: events.title,
      description: events.description,
      icon: events.icon,
      projectId: events.projectId,
      createdAt: events.createdAt,
      channelName: channels.name,
      read: readExpr,
      bookmarked: bookmarkedExpr,
    })
    .from(events)
    .innerJoin(
      channels,
      and(eq(events.channelId, channels.id), eq(events.projectId, channels.projectId)),
    )
    .where(and(...conditions))
    .orderBy(...getOrderBy(options))
    .limit(options.limit ?? 100);

  const eventIds = eventData.map((event) => event.id);
  const fetchedTags = await getEventTags(eventIds);

  return eventData.map((event) => ({
    ...event,
    tags: fetchedTags[event.id] || {},
    read: Boolean(event.read),
    bookmarked: Boolean(event.bookmarked),
  })) as EventWithChannelName[];
}

type CountOptions = Pick<
  QueryOptions,
  "title" | "object" | "action" | "startDate" | "endDate" | "tags"
>;

export async function countChannelEvents(
  channelId: number,
  options: CountOptions,
): Promise<number> {
  const conditions: any[] = [eq(events.channelId, channelId)];
  applyFilterConditions(conditions, options);
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(events)
    .innerJoin(channels, eq(events.channelId, channels.id))
    .where(and(...conditions));
  return count;
}

export async function countProjectEvents(
  projectId: number,
  options: CountOptions,
): Promise<number> {
  const conditions: any[] = [eq(events.projectId, projectId)];
  applyFilterConditions(conditions, options);
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(events)
    .innerJoin(
      channels,
      and(eq(events.channelId, channels.id), eq(events.projectId, channels.projectId)),
    )
    .where(and(...conditions));
  return count;
}

export async function getEvent(
  eventId: number,
  userId?: number,
): Promise<EventWithChannelName | null> {
  const readExpr =
    userId !== undefined
      ? exists(
          db
            .select({ _: sql`1` })
            .from(channelReads)
            .where(
              and(
                eq(channelReads.channelId, events.channelId),
                eq(channelReads.userId, userId),
                gte(channelReads.lastReadAt, events.createdAt),
              ),
            ),
        )
      : sql<boolean>`0`;

  const bookmarkedExpr =
    userId !== undefined
      ? exists(
          db
            .select({ _: sql`1` })
            .from(bookmarks)
            .where(and(eq(bookmarks.eventId, events.id), eq(bookmarks.userId, userId))),
        )
      : sql<boolean>`0`;

  const eventData = await db
    .select({
      id: events.id,
      eventObject: events.eventObject,
      eventAction: events.eventAction,
      title: events.title,
      description: events.description,
      icon: events.icon,
      projectId: events.projectId,
      createdAt: events.createdAt,
      channelName: channels.name,
      read: readExpr,
      bookmarked: bookmarkedExpr,
    })
    .from(events)
    .innerJoin(channels, eq(events.channelId, channels.id))
    .where(eq(events.id, eventId))
    .limit(1);

  if (eventData.length === 0) {
    return null;
  }

  const event = eventData[0];
  const tags = await getEventTags([event.id]);

  return {
    ...event,
    tags: tags[event.id] || {},
    read: Boolean(event.read),
    bookmarked: Boolean(event.bookmarked),
  };
}

type ExportOptions = {
  title?: string | null;
  object?: string | null;
  action?: string | null;
  startDate?: Date;
  endDate?: Date;
  tags?: TagFilter[];
  sortBy?: SortField;
  sortOrder?: SortOrder;
};

function buildExportConditions(base: any[], options: ExportOptions) {
  applyFilterConditions(base, options);
  return base;
}

export async function exportChannelEvents(
  channelId: number,
  options: ExportOptions,
): Promise<EventWithChannelName[]> {
  const conditions = buildExportConditions([eq(events.channelId, channelId)], options);

  const eventData = await db
    .select({
      id: events.id,
      eventObject: events.eventObject,
      eventAction: events.eventAction,
      title: events.title,
      description: events.description,
      icon: events.icon,
      projectId: events.projectId,
      createdAt: events.createdAt,
      channelName: channels.name,
    })
    .from(events)
    .innerJoin(channels, eq(events.channelId, channels.id))
    .where(and(...conditions))
    .orderBy(...getOrderBy(options));

  const fetchedTags = await getEventTags(eventData.map((e) => e.id));
  return eventData.map((e) => ({
    ...e,
    tags: fetchedTags[e.id] || {},
    read: false,
    bookmarked: false,
  }));
}

export async function exportProjectEvents(
  projectId: number,
  options: ExportOptions,
): Promise<EventWithChannelName[]> {
  const conditions = buildExportConditions([eq(events.projectId, projectId)], options);

  const eventData = await db
    .select({
      id: events.id,
      eventObject: events.eventObject,
      eventAction: events.eventAction,
      title: events.title,
      description: events.description,
      icon: events.icon,
      projectId: events.projectId,
      createdAt: events.createdAt,
      channelName: channels.name,
    })
    .from(events)
    .innerJoin(channels, eq(events.channelId, channels.id))
    .where(and(...conditions))
    .orderBy(...getOrderBy(options));

  const fetchedTags = await getEventTags(eventData.map((e) => e.id));
  return eventData.map((e) => ({
    ...e,
    tags: fetchedTags[e.id] || {},
    read: false,
    bookmarked: false,
  }));
}

export async function getDistinctEventObjects(
  scope: { projectId: number } | { channelId: number },
): Promise<string[]> {
  const filter =
    "projectId" in scope
      ? eq(events.projectId, scope.projectId)
      : eq(events.channelId, scope.channelId);
  const rows = await db
    .selectDistinct({ value: events.eventObject })
    .from(events)
    .where(and(filter, ne(events.eventObject, RESERVED_OBJECT)))
    .orderBy(asc(events.eventObject));
  return rows.map((r) => r.value);
}

export async function getDistinctEventActions(
  scope: { projectId: number } | { channelId: number },
  object?: string,
): Promise<string[]> {
  const filter =
    "projectId" in scope
      ? eq(events.projectId, scope.projectId)
      : eq(events.channelId, scope.channelId);
  const objectFilter = object
    ? eq(events.eventObject, object)
    : ne(events.eventObject, RESERVED_OBJECT);
  const rows = await db
    .selectDistinct({ value: events.eventAction })
    .from(events)
    .where(and(filter, objectFilter))
    .orderBy(asc(events.eventAction));
  return rows.map((r) => r.value);
}

export async function createEvent({
  name,
  title,
  description,
  icon,
  channel,
  apiKey,
  tags,
}: {
  name: string;
  title: string;
  description?: string;
  icon?: string;
  channel: string;
  apiKey: string;
  tags?: Record<string, string | number | boolean>;
}): Promise<EventWithChannelName> {
  const match = name.match(EVENT_NAME_REGEX);
  if (!match) {
    throw new Error("name must follow the object.action convention (e.g. server.status_changed).");
  }
  const [eventObject, eventAction] = name.split(".");
  if (eventObject === RESERVED_OBJECT) {
    throw new Error("'legacy' is a reserved object name.");
  }

  const channelsRes = await db.select().from(channels).where(eq(channels.name, channel));

  if (channelsRes.length === 0) {
    throw new Error(`Channel with name ${channel} does not exist.`);
  }

  const channelId = channelsRes[0].id;

  const project = await getProject(channelsRes[0].projectId);
  const projectId = project.id;

  if (project.apiKey !== apiKey) {
    throw new Error("Invalid API key.");
  }

  const res = await db
    .insert(events)
    .values({ eventObject, eventAction, title, description, icon, projectId, channelId })
    .returning();

  const event = res[0];

  let tagPayload: TagPrimitive = {};
  if (tags) {
    const tagEntries = Object.entries(tags).map(([key, value]) => ({
      eventId: event.id,
      key,
      value: String(value),
      type: typeof value as "string" | "number" | "boolean",
    }));

    await db.insert(eventTags).values(tagEntries);
    tagPayload = tags;
  }

  return {
    id: event.id,
    eventObject: event.eventObject,
    eventAction: event.eventAction,
    title: event.title,
    icon: event.icon,
    description: event.description,
    tags: tagPayload,
    projectId: project.id,
    channelName: channelsRes[0].name,
    createdAt: event.createdAt,
    read: false,
    bookmarked: false,
  };
}

export async function deleteEvent(id: number): Promise<void> {
  await db.delete(events).where(eq(events.id, id));
}
