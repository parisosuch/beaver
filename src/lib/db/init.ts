import { db } from "./db";

export async function initDB() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      api_key TEXT UNIQUE NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  // Channels table
  await db.run(`
    CREATE TABLE IF NOT EXISTS channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL
    )
  `);

  // Logs table
  await db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      level TEXT DEFAULT 'info',
      channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL
    )
  `);

  console.log("Database initialized ✅");
}
