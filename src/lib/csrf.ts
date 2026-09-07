const DEFAULT_LOCAL_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

export function allowedOrigins() {
  const configured = (process.env.NEXT_PUBLIC_APP_URL || "")
    .split(",")
    .map(value => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const vercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
  return new Set([...DEFAULT_LOCAL_ORIGINS, ...configured, ...(vercel ? [vercel] : [])]);
}

export function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return allowedOrigins().has(origin.replace(/\/$/, ""));
}

export function isMutation(request: Request) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(request.method.toUpperCase());
}
