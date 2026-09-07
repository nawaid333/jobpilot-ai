import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAllowedOrigin, isMutation } from "@/lib/csrf";

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

  if (request.nextUrl.pathname.startsWith("/api/") && isMutation(request)) {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json(
        { error: "Cross-site request blocked." },
        { status: 403, headers: response.headers },
      );
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
