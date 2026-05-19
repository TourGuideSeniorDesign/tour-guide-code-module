import type { NextRequest } from "next/server";
import {
  ImageUploadSchema,
  MAX_IMAGE_BYTES,
  parseDataUrl,
} from "@/lib/tour-schema";
import { storeImage } from "@/lib/tour-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = ImageUploadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const decoded = parseDataUrl(parsed.data.dataUrl);
  if (!decoded) {
    return Response.json(
      { error: "could not decode data URL" },
      { status: 400 },
    );
  }
  if (decoded.bytes.length > MAX_IMAGE_BYTES) {
    return Response.json(
      {
        error: `image too large (max ${MAX_IMAGE_BYTES} bytes, got ${decoded.bytes.length})`,
      },
      { status: 413 },
    );
  }

  const { filename, url } = await storeImage(decoded.bytes, decoded.ext);
  return Response.json({ filename, url, mime: decoded.mime });
}
