import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function expectedOrigins(request: NextRequest) {
  const origins = new Set<string>([request.nextUrl.origin]);
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (configured) {
    try {
      origins.add(new URL(configured).origin);
    } catch {
      // Ignore malformed optional configuration and keep the request origin.
    }
  }
  return origins;
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");

  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  if (request.nextUrl.pathname.startsWith("/api/") && UNSAFE_METHODS.has(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && !expectedOrigins(request).has(origin)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: response.headers });
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
