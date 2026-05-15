// src/db/schema.ts
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ---- PROJECTS ----
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").unique().notNull(),
  apiKey: text("api_key").unique().notNull(), // for external logging API
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }), // TODO: should a delete on user delete the owner?
});

// ---- CHANNEL GROUPS ----
export const channelGroups = sqliteTable(
  "channel_groups",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    order: integer("order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
  },
  (table) => ({
    projectIdIdx: index("channel_groups_project_id_idx").on(table.projectId),
  }),
);

// ---- CHANNELS ----
export const channels = sqliteTable(
  "channels",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description"),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    groupId: integer("group_id").references(() => channelGroups.id),
    order: integer("order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
  },
  (table) => ({
    projectIdIdx: index("channels_project_id_idx").on(table.projectId),
    nameIdx: index("channels_name_idx").on(table.name),
  }),
);

// ---- EVENTS ----
export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon"),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    channelId: integer("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
  },
  (table) => ({
    channelCreatedAtIdx: index("events_channel_id_created_at_idx").on(
      table.channelId,
      table.createdAt,
    ),
    projectCreatedAtIdx: index("events_project_id_created_at_idx").on(
      table.projectId,
      table.createdAt,
    ),
    channelNameIdIdx: index("events_channel_id_name_id_idx").on(
      table.channelId,
      table.name,
      table.id,
    ),
    projectNameIdIdx: index("events_project_id_name_id_idx").on(
      table.projectId,
      table.name,
      table.id,
    ),
  }),
);

// --- EVENT TAGS ---
export const eventTags = sqliteTable(
  "event_tags",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    key: text("key").notNull(),

    value: text("value").notNull(),

    type: text("type", {
      enum: ["string", "number", "boolean"],
    }).notNull(),
  },
  (table) => ({
    eventIdIdx: index("event_tags_event_id_idx").on(table.eventId),
    eventIdKeyValueIdx: index("event_tags_event_id_key_value_idx").on(
      table.eventId,
      table.key,
      table.value,
    ),
  }),
);

// --- USER ----
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  canCreateProjects: integer("can_create_projects", { mode: "boolean" }).notNull().default(false),
  userName: text("username").notNull(),
  email: text("email"),
  password: text("password").notNull(),
  mustChangePassword: integer("must_change_password", { mode: "boolean" }).notNull().default(false),
  tempPassword: text("temp_password"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
});

// --- PROJECT MEMBERS ---
export const projectMembers = sqliteTable(
  "project_members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "maintainer", "guest"] })
      .notNull()
      .default("guest"),
    notificationsEnabled: integer("notifications_enabled", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
  },
  (table) => ({
    projectUserIdx: index("project_members_project_id_user_id_idx").on(
      table.projectId,
      table.userId,
    ),
    userIdIdx: index("project_members_user_id_idx").on(table.userId),
  }),
);

// --- CHANNEL READS ---
export const channelReads = sqliteTable(
  "channel_reads",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channelId: integer("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    lastReadAt: integer("last_read_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    userChannelIdx: uniqueIndex("channel_reads_user_channel_idx").on(table.userId, table.channelId),
  }),
);

// --- BOOKMARKS ---
export const bookmarks = sqliteTable(
  "bookmarks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
  },
  (table) => ({
    userEventIdx: uniqueIndex("bookmarks_user_event_idx").on(table.userId, table.eventId),
  }),
);

// --- SESSIONS ----
export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").unique().notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
});

// ---- RELATIONS ----
export const projectRelations = relations(projects, ({ many }) => ({
  channels: many(channels),
  channelGroups: many(channelGroups),
  members: many(projectMembers),
}));

export const channelGroupRelations = relations(channelGroups, ({ one, many }) => ({
  project: one(projects, {
    fields: [channelGroups.projectId],
    references: [projects.id],
  }),
  channels: many(channels),
}));

export const channelRelations = relations(channels, ({ one, many }) => ({
  project: one(projects, {
    fields: [channels.projectId],
    references: [projects.id],
  }),
  group: one(channelGroups, {
    fields: [channels.groupId],
    references: [channelGroups.id],
  }),
  events: many(events),
}));

export const eventRelations = relations(events, ({ one }) => ({
  channel: one(channels, {
    fields: [events.channelId],
    references: [channels.id],
  }),
}));

export const eventTagRelations = relations(eventTags, ({ one }) => ({
  event: one(events, {
    fields: [eventTags.eventId],
    references: [events.id],
  }),
}));

// A user can own many projects and have many sessions
export const userRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  sessions: many(sessions),
  projectMemberships: many(projectMembers),
}));

export const projectMemberRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
}));

export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const channelReadRelations = relations(channelReads, ({ one }) => ({
  user: one(users, {
    fields: [channelReads.userId],
    references: [users.id],
  }),
  channel: one(channels, {
    fields: [channelReads.channelId],
    references: [channels.id],
  }),
}));
