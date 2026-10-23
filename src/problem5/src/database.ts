import { DatabaseSync } from 'node:sqlite';

export function openDatabase(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
      description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 2000),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS resources_status_created ON resources(status, created_at, id);
    CREATE INDEX IF NOT EXISTS resources_created ON resources(created_at, id);
  `);
  return db;
}
