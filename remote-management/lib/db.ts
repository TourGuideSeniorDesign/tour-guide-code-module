import Database from "better-sqlite3";
import path from "node:path";

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(process.cwd(), "remote-management.db");

const g = globalThis as unknown as { __db?: Database.Database };

function open(): Database.Database {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source);
    CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
    CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);

    CREATE TABLE IF NOT EXISTS status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      battery_level REAL NOT NULL,
      battery_voltage REAL NOT NULL,
      state TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE INDEX IF NOT EXISTS idx_status_timestamp ON status(timestamp);
  `);
  return db;
}

export const db: Database.Database = g.__db ?? (g.__db = open());

export type LogRow = {
  id: number;
  source: string;
  level: string;
  message: string;
  timestamp: string;
};

export type StatusRow = {
  id: number;
  battery_level: number;
  battery_voltage: number;
  state: string;
  latitude: number | null;
  longitude: number | null;
  timestamp: string;
};
