import { NextRequest } from "next/server";
import { db, type StatusRow } from "@/lib/db";

export const dynamic = "force-dynamic";

const insertStatus = db.prepare(
  `INSERT INTO status (battery_level, battery_voltage, state, latitude, longitude)
   VALUES (?, ?, ?, ?, ?) RETURNING *`,
);

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<StatusRow>;
  if (
    typeof body.battery_level !== "number" ||
    typeof body.battery_voltage !== "number" ||
    typeof body.state !== "string"
  ) {
    return Response.json(
      { detail: "battery_level, battery_voltage, state are required" },
      { status: 400 },
    );
  }
  const row = insertStatus.get(
    body.battery_level,
    body.battery_voltage,
    body.state,
    body.latitude ?? null,
    body.longitude ?? null,
  ) as StatusRow;
  return Response.json(row);
}
