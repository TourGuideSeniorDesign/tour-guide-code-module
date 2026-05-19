import { NextResponse, type NextRequest } from "next/server";

const REALM = 'Basic realm="Remote Management", charset="UTF-8"';

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/api/health") {
    return NextResponse.next();
  }

  const user = process.env.ADMIN_USERNAME ?? "admin";
  const pass = process.env.ADMIN_PASSWORD ?? "changeme";
  const expected = "Basic " + btoa(`${user}:${pass}`);
  const provided = req.headers.get("authorization") ?? "";

  if (!safeEqual(provided, expected)) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": REALM },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
