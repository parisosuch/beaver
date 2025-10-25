import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";

// TODO: Will probably want to create a sqlite file for each project instead of storing all projects on the same db file

const sqlite = new Database("mydb.sqlite");
export const db = drizzle(sqlite);
