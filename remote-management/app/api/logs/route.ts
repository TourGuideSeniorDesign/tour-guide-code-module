import { NextRequest } from "next/server";
import { db, type LogRow } from "@/lib/db";

export const dynamic = "force-dynamic";

const insertLog = db.prepare(
  "INSERT INTO logs (source, level, message) VALUES (?, ?, ?) RETURNING *",
);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const source = sp.get("source");
  const level = sp.get("level");
  const cursor = sp.get("cursor");
  const limit = Math.min(Number(sp.get("limit") ?? 50), 100);

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (source) {
    where.push("source = ?");
    params.push(source);
  }
  if (level) {
    where.push("level = ?");
    params.push(level);
  }
  if (cursor) {
    where.push("id < ?");
    params.push(Number(cursor));
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `SELECT * FROM logs ${whereSql} ORDER BY id DESC LIMIT ?`,
    )
    .all(...params, limit + 1) as LogRow[];

  const has_more = rows.length > limit;
  const logs = has_more ? rows.slice(0, limit) : rows;
  const next_cursor = has_more && logs.length ? logs[logs.length - 1].id : null;

  return Response.json({ logs, next_cursor, has_more });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { source?: string; level?: string; message?: string };
  if (!body.source || !body.level || !body.message) {
    return Response.json({ detail: "source, level, message are required" }, { status: 400 });
  }
  const row = insertLog.get(body.source, body.level, body.message) as LogRow;
  return Response.json(row);
}
