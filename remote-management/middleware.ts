import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, checkCredentials, verifySession } from "./lib/auth";

const PUBLIC_PATHS = new Set(["/login", "/api/login", "/api/health"]);

function checkBasicAuth(req: NextRequest): boolean {
  const header = req.headers.get("authorization");
  if (!header || !header.toLowerCase().startsWith("basic ")) return false;
  try {
    const decoded = atob(header.slice(6).trim());
    const idx = decoded.indexOf(":");
    if (idx < 0) return false;
    return checkCredentials(decoded.slice(0, idx), decoded.slice(idx + 1));
  } catch {
    return false;
  }
}

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
  if (checkBasicAuth(req)) return NextResponse.next();

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
