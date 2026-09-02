# JobPilot AI — QA & Security Checklist

## Authentication
- [ ] Unauthenticated API requests return 401.
- [ ] Expired sessions are rejected.
- [ ] Session cookies are HttpOnly, SameSite=Lax and Secure in production.
- [ ] Login and signup reject malformed input and unexpected payloads.
- [ ] Passwords are never logged or returned by APIs.

## Authorization / ownership
- [ ] Users can only read and mutate their own applications, tailored packages, profiles, preferences, Gmail connections and email signals.
- [ ] Cross-user IDs return 404/401 without leaking resource details.
- [ ] User-controlled job records cannot grant access to another user's tracker data.

## CSRF / browser security
- [ ] State-changing requests reject unexpected Origin/Referer values.
- [ ] Security headers are present in production.
- [ ] No sensitive token is exposed to browser JavaScript.

## Input validation
- [ ] IDs have bounded lengths.
- [ ] Free-text fields have bounded lengths.
- [ ] Arrays have bounded item counts and item lengths.
- [ ] URLs accept only http/https where appropriate.
- [ ] Invalid JSON and unexpected types return 400 rather than 500.

## AI safety / quality
- [ ] AI output is treated as untrusted data.
- [ ] Candidate facts are evidence-only; no invented experience, skills or achievements.
- [ ] AI failures have deterministic fallbacks.
- [ ] AI request throttling and usage credits are enforced.

## Gmail
- [ ] OAuth state is unpredictable, user-bound and single-use.
- [ ] Refresh tokens are encrypted at rest.
- [ ] OAuth scope remains read-only.
- [ ] Disconnect removes the Gmail connection and derived email signals.
- [ ] Gmail API failures do not expose access tokens.

## Production readiness
- [ ] Production environment validation passes.
- [ ] Database backups and restore procedure tested.
- [ ] Error monitoring configured.
- [ ] Privacy policy and terms published.
- [ ] Payments remain disabled until billing has been explicitly tested and approved.
