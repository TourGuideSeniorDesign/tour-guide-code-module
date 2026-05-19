import { readImage } from "@/lib/tour-store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const result = await readImage(name);
  if (!result) {
    return new Response("not found", { status: 404 });
  }
  return new Response(new Uint8Array(result.bytes), {
    headers: {
      "content-type": result.mime,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
