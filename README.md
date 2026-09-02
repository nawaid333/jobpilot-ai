# JobPilot AI

AI-powered job search and application assistant.

## Vision
Help job seekers turn a CV into a structured career profile, discover genuinely relevant jobs, tailor application materials, track applications, and prepare for interviews.

## Product principles
- Never invent experience, skills, education, or achievements.
- Optimize for genuine job fit rather than application volume.
- Do not promise job or interview outcomes.
- Use authorized job and application channels.
- Keep high-impact actions under user control unless explicitly enabled.

## Current product flow
1. Landing page
2. CV upload and AI analysis
3. ATS/resume quality analysis
4. Master career profile
5. Job preferences
6. Job discovery from public Lever postings
7. Evidence-based job matching
8. Tailored application package
9. Application tracker

## Persistence foundation
PostgreSQL + Prisma is now defined for account-owned career profiles, job preferences, normalized jobs and applications. The current UI still uses localStorage until authentication and authenticated Prisma API routes are added.

See `docs/PERSISTENCE.md` for the migration plan.

## Planned stack
- Next.js + TypeScript
- PostgreSQL + Prisma
- Redis/background jobs
- OpenAI API

## Status
MVP product workflow built; persistence and authentication next.
