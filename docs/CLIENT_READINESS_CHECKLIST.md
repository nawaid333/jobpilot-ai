# JobPilot AI — Client Readiness Checklist

Use this checklist before the client review or production release. It is intentionally operational: a green build alone does not prove that OAuth, AI generation, exports, or database-backed workflows work in a real environment.

## Release gate

- [ ] `npm install` completes without dependency errors.
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm audit --audit-level=high` passes with no high/critical findings.
- [ ] `npm run build` completes successfully.
- [ ] `/api/health` returns HTTP 200 with healthy database/config checks.
- [ ] Security regression suite passes.
- [ ] Application-status regression suite passes.

## Core user journey

- [ ] Sign up and sign in work with a real account.
- [ ] CV upload/analysis works with a real CV and the result is reviewable.
- [ ] Career Profile can be created and edited.
- [ ] Job discovery returns configured live sources and handles an empty/error response clearly.
- [ ] A job can be saved to the Tracker.
- [ ] Tailored CV/cover letter generation stays grounded in the user's profile.
- [ ] DOCX/PDF exports open successfully.
- [ ] Application status changes persist correctly through Saved → Preparing → Applied → Interview → Offer/Rejected.
- [ ] Analytics reflects application changes.
- [ ] Interview preparation works for a real tracked application.
- [ ] Copilot and Agent produce useful actions from current workspace data.

## Optional integrations

- [ ] Gmail OAuth is configured with production redirect URI and read-only scopes.
- [ ] Gmail recruiter intelligence handles no-matching-email and API-error cases.
- [ ] Any connected Google account can be disconnected/revoked as expected.

## Security / operations

- [ ] Production secrets are supplied only through the deployment secret manager; no real secrets are committed.
- [ ] `NEXT_PUBLIC_APP_URL` is the production HTTPS origin.
- [ ] Database backups/restore procedure is confirmed.
- [ ] Authentication/session behavior has been tested in production-like deployment.
- [ ] Rate limits and origin validation have been tested on sensitive API routes.
- [ ] Payments remain disabled unless the complete billing flow has been explicitly approved and tested.

## Demo order

For the client review, use one continuous story rather than opening disconnected screens:

1. Sign in.
2. Show the Career Profile.
3. Discover a relevant job.
4. Save it to Tracker.
5. Open Tailor and generate/review application materials.
6. Show the resulting application in Tracker.
7. Demonstrate status progression.
8. Open Interview prep for that application.
9. Show Analytics updating from the tracked data.
10. Finish with Copilot/Agent showing the next recommended action.

The README describes the intended workflow and product safety principles; this checklist is the concrete release gate for validating that workflow in a deployed environment.
