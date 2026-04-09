import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { resolve, dirname } from "path";
import { mkdirSync } from "fs";

const dbPath = resolve(process.cwd(), "data", "beaver.sqlite");
mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: "./drizzle" });

console.log("Migrations complete.");
sqlite.close();
