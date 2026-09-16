# Agent Activity History

## Purpose

Agent Activity History is a user-visible audit trail for actions JobPilot has recorded while assisting with a job search. It makes Agent behavior inspectable without turning the Agent into an autonomous submission or messaging system.

## Data contract

- Results are scoped to the authenticated user.
- Entries are ordered newest first.
- The API caps each request at 50 records and reports whether additional records exist.
- Application context includes only the application id, current status, job title, and company.
- Stored Agent results are reduced to safe display fields (`message`, `next`, and `followUpDueAt`); raw JSON is not exposed by the history endpoint.
- Processing and failed actions remain visible so the audit trail does not imply success where none occurred.

## User control

History is informational. It does not submit applications, send recruiter emails, or mutate application state. Application links return the user to the existing controlled application workflow.
