import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "./lib/auth";

const PUBLIC_PATHS = new Set(["/login", "/api/login", "/api/health"]);

function isPublicPath(pathname: string, method: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  // Frontend reads tour content unauthenticated; writes still require auth.
  if (pathname === "/api/tour" && method === "GET") return true;
  if (pathname === "/api/tour/version" && method === "GET") return true;
  if (pathname === "/api/tour/wait" && method === "GET") return true;
  if (pathname.startsWith("/api/tour-images/") && method === "GET") return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname, req.method)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
