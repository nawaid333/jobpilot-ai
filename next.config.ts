import type { NextConfig } from "next";
import { PRODUCTION_CONTENT_SECURITY_POLICY } from "./src/lib/content-security-policy";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

if (process.env.NODE_ENV === "production") {
  securityHeaders.push({
    key: "Content-Security-Policy",
    value: PRODUCTION_CONTENT_SECURITY_POLICY,
  });
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep pdf-parse and its native canvas dependency external so their worker and
  // native runtime files resolve from node_modules on Vercel's Node runtime.
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
