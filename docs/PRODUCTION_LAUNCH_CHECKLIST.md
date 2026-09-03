# JobPilot AI — Production Launch Checklist

Use this checklist before enabling public production traffic.

## Required infrastructure

- [ ] PostgreSQL production database provisioned.
- [ ] `DATABASE_URL` configured as a secret.
- [ ] `OPENAI_API_KEY` configured as a server-side secret.
- [ ] `GMAIL_TOKEN_ENCRYPTION_KEY` configured as a strong 32-byte secret when Gmail is enabled.
- [ ] `NEXT_PUBLIC_APP_URL` set to the canonical HTTPS production URL.
- [ ] Production Google OAuth credentials and HTTPS redirect URI configured if Gmail is enabled.
- [ ] `JOBPILOT_LEVER_COMPANIES` populated with approved public job sources.

## Deployment verification

- [ ] `npm install` completes without unexpected dependency warnings.
- [ ] `npx prisma generate` succeeds.
- [ ] Database migration/schema deployment succeeds against a production database.
- [ ] `npm run build` succeeds with production environment variables.
- [ ] `/api/health` returns HTTP 200 and reports database/configuration as `ok`.
- [ ] Production server starts successfully and remains healthy after restart.

## Security verification

- [ ] Security regression suite passes in CI.
- [ ] Authentication and session expiration are verified.
- [ ] User ownership/isolation checks pass for application, profile, Gmail, and AI endpoints.
- [ ] OAuth state validation and token encryption are verified.
- [ ] Production HTTPS and security headers are verified.
- [ ] Dependency security audit has no unaccepted high-severity vulnerabilities.
- [ ] Rate limiting is validated under repeated requests.
- [ ] Sensitive API responses are not cached.

## Data protection and operations

- [ ] Automated database backups are enabled by the hosting provider.
- [ ] A database restore has been tested successfully.
- [ ] Error monitoring and server logs are enabled.
- [ ] Secrets are stored in the deployment secret manager, never in Git.
- [ ] Retention/cleanup policy is documented for sessions, Gmail signals, and AI usage data.

## Product verification

- [ ] Sign up/sign in works.
- [ ] CV upload and analysis work with representative files.
- [ ] Career Profile creation/editing works.
- [ ] Live job discovery returns configured sources.
- [ ] Job matching and saving work.
- [ ] Tailored CV and cover-letter generation work.
- [ ] DOCX/PDF exports open correctly.
- [ ] Application tracking works through the full status lifecycle.
- [ ] Gmail connection, callback, scan, and signal workflows work when enabled.
- [ ] Interview Coach works.
- [ ] Copilot and Analytics work.
- [ ] Payments remain disabled until billing has been explicitly tested and approved.

## Launch gate

Do not launch until all required infrastructure, deployment, security, and critical product checks above are complete. A green CI run is necessary but is not by itself proof that production infrastructure or third-party integrations are configured correctly.
