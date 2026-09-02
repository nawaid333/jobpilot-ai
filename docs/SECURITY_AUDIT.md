# JobPilot AI Security Audit

## Status

Production security hardening is in progress. Payments remain disabled during development.

## Completed

- Passwords use salted scrypt hashes.
- Existing legacy SHA-256 password hashes are upgraded to scrypt after a successful login.
- Authentication uses server-side sessions rather than client-only password state.
- Tailored applications and application actions enforce authenticated ownership checks.
- Gmail refresh tokens are encrypted at rest and Gmail access is read-only.
- JobPilot does not automatically submit applications or send recruiter follow-ups.
- AI tailoring and Copilot are instructed to use workspace facts and not invent candidate credentials.
- Production build runs through GitHub Actions CI.

## Release Gate

Before production launch, verify:

1. Secure, production-only cookie settings and session expiration/cleanup.
2. Rate limiting on authentication and other expensive/public API routes.
3. CSRF/origin protection for state-changing browser requests.
4. Authorization/ownership checks on every user-scoped API route.
5. Validation and size limits for CV/document uploads.
6. Safe handling and logging of AI/API errors without leaking secrets.
7. Gmail OAuth redirect, state, token storage, and disconnect behavior.
8. Database indexes and retention/cleanup for sessions, AI usage, and email signals.
9. Security headers and a restrictive production Content Security Policy where compatible.
10. Dependency audit and current Next.js/React security releases.
11. Production environment variable validation and secret rotation procedure.
12. No payment activation until end-to-end billing is explicitly tested and approved.

## Trust Requirements

- Never claim guaranteed interviews or employment.
- Never fabricate experience, skills, education, metrics, or achievements.
- Never submit an application or send an email without explicit user control.
- AI recommendations must remain grounded in the user's stored workspace facts.
