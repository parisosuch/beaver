import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "./schema";

// TODO: Will probably want to create a sqlite file for each project instead of storing all projects on the same db file

import { resolve, dirname } from "path";
import { mkdirSync } from "fs";

const dbPath = resolve(process.cwd(), "data", "beaver.sqlite");
mkdirSync(dirname(dbPath), { recursive: true });
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });
