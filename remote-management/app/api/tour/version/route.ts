import { readVersion } from "@/lib/tour-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const version = await readVersion();
  return Response.json(
    { version },
    { headers: { "cache-control": "no-store" } },
  );
}
