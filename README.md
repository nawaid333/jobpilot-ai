# JobPilot AI

**Your AI Job Search & Application Agent.**

JobPilot helps you turn a real CV into a structured career profile, discover relevant jobs, prepare truthful tailored applications, track progress, understand recruiter emails, and practice for interviews — while keeping high-impact actions under your control.

## Product principles

- **No fake promises:** JobPilot does not guarantee interviews, offers, or employment.
- **Truth-first applications:** AI must not invent experience, skills, education, achievements, or metrics.
- **Quality over volume:** matching prioritizes genuine fit rather than indiscriminate applications.
- **User control:** JobPilot prepares and assists; it does not silently submit applications or send recruiter emails.
- **Evidence-grounded AI:** Copilot and generation flows reason from the user's workspace facts.

## Current workflow

1. **Sign up / sign in** with server-side sessions and hardened password hashing.
2. **Upload your CV** and review AI-assisted analysis and ATS-oriented feedback.
3. **Build your Career Profile** from verified experience and preferences.
4. **Discover live jobs** and review match signals.
5. **Save jobs** to your application tracker.
6. **Prepare an application** with a tailored CV and cover letter grounded in your profile.
7. **Review and export** DOCX/PDF materials.
8. **Apply manually** through the employer's permitted application channel.
9. **Track the application** through Saved → Preparing → Applied → Interview → Offer/Rejected.
10. **Connect Gmail optionally** for read-only recruiter/application intelligence and suggested status updates.
11. **Practice interviews** using evidence-based questions and answer review.
12. **Use Copilot and Analytics** to decide what to improve next.

## Safety and automation

JobPilot supports controlled automation for preparation and follow-up workflows, but high-impact actions remain user-controlled. It does not automatically submit applications or send recruiter follow-ups.

## Payments

Payments are intentionally disabled while JobPilot is in development and testing. Do not enable billing until the complete product and billing flow have been explicitly tested and approved.

## Technology

- Next.js + TypeScript + React
- PostgreSQL + Prisma
- OpenAI API
- PDF/DOCX export
- Optional Gmail OAuth integration
- GitHub Actions CI

## Security

Password storage uses salted scrypt hashes. Legacy SHA-256 password hashes are migrated to the stronger format after successful authentication. See `docs/SECURITY_AUDIT.md` for the production release security checklist.

## Development

Install dependencies, configure the environment variables from `.env.example`, provision PostgreSQL, generate Prisma client, and run the Next.js development server. The repository CI also provisions PostgreSQL and verifies the production build.
