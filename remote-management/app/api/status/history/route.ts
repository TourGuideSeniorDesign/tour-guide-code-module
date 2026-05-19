import { NextRequest } from "next/server";
import { db, type StatusRow } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 100), 1000);
  const rows = db
    .prepare("SELECT * FROM status ORDER BY id DESC LIMIT ?")
    .all(limit) as StatusRow[];
  return Response.json(rows);
}
