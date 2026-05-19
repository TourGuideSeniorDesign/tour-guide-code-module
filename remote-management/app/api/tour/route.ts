import type { NextRequest } from "next/server";
import { TourDataSchema } from "@/lib/tour-schema";
import { readTour, readVersion, writeTour } from "@/lib/tour-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const [tour, version] = await Promise.all([readTour(), readVersion()]);
  return Response.json(
    { version, tour },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

export async function PUT(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = TourDataSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "validation failed",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const version = await writeTour(parsed.data);
  return Response.json({ version, tour: parsed.data });
}
