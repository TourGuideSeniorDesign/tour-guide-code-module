import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BRIDGE_URL = process.env.ROS_BRIDGE_URL ?? "http://127.0.0.1:9100/state";

export async function GET() {
  try {
    const res = await fetch(BRIDGE_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `bridge returned ${res.status}` },
        { status: 502 },
      );
    }
    return NextResponse.json(await res.json());
  } catch (err) {
    return NextResponse.json(
      { error: "bridge unreachable", detail: String(err) },
      { status: 502 },
    );
  }
}
