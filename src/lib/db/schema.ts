// src/db/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
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

// ---- CHANNELS ----
export const channels = sqliteTable("channels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
});

// ---- EVENTS ----
export const events = sqliteTable("events", {
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
});

// --- EVENT TAGS ---
export const eventTags = sqliteTable("event_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),

  key: text("key").notNull(),

  value: text("value").notNull(),

  type: text("type", {
    enum: ["string", "number", "boolean"],
  }).notNull(),
});

// --- USER ----
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  userName: text("username").notNull(),
  password: text("password").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`)
    .notNull(),
});

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
}));

export const channelRelations = relations(channels, ({ one, many }) => ({
  project: one(projects, {
    fields: [channels.projectId],
    references: [projects.id],
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
}));

export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
