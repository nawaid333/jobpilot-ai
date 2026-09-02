# JobPilot AI — Persistence Foundation

JobPilot now uses PostgreSQL/Prisma for account-owned career data and application tracking. The browser UI is no longer the source of truth for these records.

## Data model

- `User` — account identity and ownership boundary.
- `Session` — server-side authenticated session with expiration and cleanup.
- `CareerProfile` — one source-of-truth career profile per user.
- `JobPreferences` — one matching-preferences record per user.
- `Job` — normalized job listing cache shared by source/job ID.
- `Application` — a user's relationship to a job, including status, notes and applied date.
- `TailoredApplication` — persisted tailored application materials owned through the user's application.
- `GmailConnection` / `EmailSignal` — optional read-only recruiter/application intelligence.
- `Subscription` / `AiUsage` — entitlement and monthly AI-credit tracking.

## Server ownership boundary

Authenticated API routes resolve the current user from the server-side session and scope user data through `userId`. Application-specific routes also verify that the referenced application belongs to the authenticated user before reading or changing it.

## Current persistence workflow

1. User signs up or signs in and receives an HTTP-only server session cookie.
2. Session records have an explicit expiration and expired sessions are cleaned up during authentication flows.
3. Career profile and job preferences are stored through authenticated Prisma routes.
4. Jobs are normalized in PostgreSQL and applications reference the owning user and saved job.
5. Tailored materials are persisted against the user's application.
6. Gmail intelligence is stored against the authenticated user and related applications/signals.
7. AI usage is tracked by user and calendar month.

## One-time browser migration

Existing browser-only data from earlier prototypes may still exist in a user's localStorage, but it is not treated as the server source of truth. A future migration helper can import old browser data after explicit user review; it should never silently overwrite persisted account data.

Do not store API keys, passwords, CV contents, or private user data in the public repository.
