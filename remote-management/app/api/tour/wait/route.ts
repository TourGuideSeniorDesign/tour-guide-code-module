import type { NextRequest } from "next/server";
import { waitForVersionChange } from "@/lib/tour-store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const sinceParam = req.nextUrl.searchParams.get("since");
  const since = sinceParam ? Number.parseInt(sinceParam, 10) : 0;
  const timeoutMs = 25_000;
  const version = await waitForVersionChange(
    Number.isFinite(since) ? since : 0,
    timeoutMs,
  );
  return Response.json(
    { version },
    { headers: { "cache-control": "no-store" } },
  );
}
