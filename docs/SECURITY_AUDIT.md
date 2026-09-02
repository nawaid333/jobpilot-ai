# JobPilot AI Security Audit

## Status

Core application security hardening is implemented; production release hardening remains in progress. Payments remain disabled during development.

## Completed

- Passwords use salted scrypt hashes.
- Existing legacy SHA-256 password hashes are upgraded to scrypt after a successful login.
- Authentication uses server-side sessions with explicit expiration, expired-session cleanup, and centralized secure cookie settings.
- Tailored applications and application actions enforce authenticated ownership checks.
- Gmail refresh tokens are encrypted at rest and Gmail access is read-only.
- JobPilot does not automatically submit applications or send recruiter follow-ups.
- AI tailoring, Copilot, CV analysis, and Interview Coach are authenticated, and AI-consuming flows enforce monthly user AI-credit limits.
- Expensive AI routes have lightweight per-user request throttling with HTTP 429 responses and `Retry-After` headers.
- CV uploads enforce PDF/DOCX type and 8 MB size limits.
- AI/API failures avoid returning provider response bodies that could expose internal details.
- Production build runs through GitHub Actions CI.

## Important implementation note

The current request throttling helper is process-local and intentionally lightweight for the development stage. Before a horizontally scaled production deployment, replace it with a shared Redis or equivalent distributed rate limiter so limits apply consistently across instances.

## Release Gate

Before production launch, verify:

1. CSRF/origin protection for state-changing browser requests.
2. Authorization/ownership checks on every user-scoped API route.
3. Gmail OAuth redirect, state, token storage, and disconnect behavior.
4. Database indexes and retention/cleanup for sessions, AI usage, and email signals.
5. Security headers and a restrictive production Content Security Policy where compatible.
6. Dependency audit and current Next.js/React security releases.
7. Production environment variable validation and secret rotation procedure.
8. Distributed rate limiting after Redis/infrastructure is available.
9. No payment activation until end-to-end billing is explicitly tested and approved.

## Trust Requirements

- Never claim guaranteed interviews or employment.
- Never fabricate experience, skills, education, metrics, or achievements.
- Never submit an application or send an email without explicit user control.
- AI recommendations must remain grounded in the user's stored workspace facts.
