# JobPilot AI — Persistence Foundation

The product currently keeps the career profile, job preferences and application tracker in browser localStorage. The PostgreSQL/Prisma foundation is now defined so those records can become account-owned data.

## Data model

- `User` — account identity and ownership boundary.
- `CareerProfile` — one source-of-truth career profile per user.
- `JobPreferences` — one matching-preferences record per user.
- `Job` — normalized job listing cache shared by source/job ID.
- `Application` — a user's relationship to a job, including status, notes and applied date.

## Local → database migration mapping

| Current browser key | Database model |
| --- | --- |
| `jobpilot-career-profile` | `CareerProfile` |
| `jobpilot-job-preferences` | `JobPreferences` |
| `jobpilot-applications` | `Application` + `Job` |

## Next implementation step

1. Provision PostgreSQL.
2. Set `DATABASE_URL` in the deployment environment.
3. Run `npm install`, then `npm run db:generate` and `npm run db:push`.
4. Add authentication and a server-side session/user boundary.
5. Replace localStorage writes with authenticated Prisma API routes.
6. Add a one-time client migration so existing browser data is not silently lost.

Do not store API keys, passwords, CV contents, or private user data in the public repository.
