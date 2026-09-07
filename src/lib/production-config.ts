const requiredInProduction = ["DATABASE_URL", "OPENAI_API_KEY", "NEXT_PUBLIC_APP_URL"] as const;

export type ProductionConfig = {
  ok: boolean;
  missing: string[];
  invalid: string[];
};

export function validateProductionConfig(env: NodeJS.ProcessEnv = process.env): ProductionConfig {
  const missing = requiredInProduction.filter((key) => !env[key]?.trim());
  const invalid: string[] = [];
  const appUrl = env.NEXT_PUBLIC_APP_URL?.trim();

  if (appUrl) {
    try {
      if (new URL(appUrl).protocol !== "https:") invalid.push("NEXT_PUBLIC_APP_URL");
    } catch {
      invalid.push("NEXT_PUBLIC_APP_URL");
    }
  }

  return { ok: missing.length === 0 && invalid.length === 0, missing, invalid };
}

export function assertProductionConfig(env: NodeJS.ProcessEnv = process.env) {
  // Instrumentation can be loaded during `next build`; fail-fast validation belongs
  // to the running production server, not the build environment.
  if (env.NODE_ENV !== "production" || env.NEXT_PHASE === "phase-production-build") return;
  const result = validateProductionConfig(env);
  if (!result.ok) {
    throw new Error(`Invalid production configuration. Missing: ${result.missing.join(", ") || "none"}; Invalid: ${result.invalid.join(", ") || "none"}`);
  }
}
