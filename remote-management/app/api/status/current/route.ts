import { db, type StatusRow } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  const row = db
    .prepare("SELECT * FROM status ORDER BY id DESC LIMIT 1")
    .get() as StatusRow | undefined;
  return Response.json(row ?? null);
}
