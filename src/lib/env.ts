const isProduction = process.env.NODE_ENV === "production";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optional(name: string) {
  return process.env[name]?.trim() || undefined;
}

function validateUrl(name: string, value: string, allowHttpLocalhost = false) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
  if (isProduction && url.protocol !== "https:") {
    throw new Error(`${name} must use HTTPS in production`);
  }
  if (!isProduction && !allowHttpLocalhost && url.protocol !== "https:") {
    throw new Error(`${name} must use HTTPS`);
  }
  return value;
}

export function validateServerEnv() {
  required("DATABASE_URL");
  validateUrl("NEXT_PUBLIC_APP_URL", required("NEXT_PUBLIC_APP_URL"), true);

  if (isProduction) {
    required("OPENAI_API_KEY");
    required("GMAIL_TOKEN_ENCRYPTION_KEY");

    const gmailClientId = optional("GOOGLE_CLIENT_ID");
    const gmailClientSecret = optional("GOOGLE_CLIENT_SECRET");
    const gmailRedirect = optional("GOOGLE_REDIRECT_URI");
    if (gmailClientId || gmailClientSecret || gmailRedirect) {
      if (!gmailClientId || !gmailClientSecret || !gmailRedirect) {
        throw new Error("Google OAuth configuration is incomplete");
      }
      validateUrl("GOOGLE_REDIRECT_URI", gmailRedirect);
    }

    // Billing remains intentionally disabled during development/testing.
    if (process.env.JOBPILOT_PAYMENTS_ENABLED === "true") {
      throw new Error("Payments are disabled until production billing is explicitly enabled");
    }
  }
}

export function getAppUrl() {
  return validateUrl("NEXT_PUBLIC_APP_URL", required("NEXT_PUBLIC_APP_URL"), true).replace(/\/$/, "");
}
