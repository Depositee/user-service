import { Database } from "duckdb-async";

export async function getOrCreateDatabase(): Promise<Database> {
  const db = await Database.create("userDB");
  await db.exec(
    `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name VARCHAR(255))`,
  );
  return db;
}
