# JobPilot AI Data Retention Contract

This document defines the production retention boundary for operational data. The policy is intentionally documented before an automated cleanup job is enabled.

## Retention targets

| Data | Retention target | Cleanup key |
| --- | --- | --- |
| Expired sessions | Delete after `expiresAt` | `Session.expiresAt` |
| Email intelligence signals | 180 days after `createdAt` | `EmailSignal.createdAt` |
| AI usage ledger | 24 completed calendar months | `AiUsage.month` (`YYYY-MM`) |
| Stale global job records | 365 days after `lastSeenAt`, only when no application references the job | `Job.lastSeenAt` |

## Safety rules

1. Cleanup must run server-side with a dedicated operational identity or protected maintenance job.
2. Cleanup must be bounded in batches so one run cannot create an unbounded database transaction.
3. User-owned application data must never be deleted solely because it is old.
4. Jobs referenced by an application must be preserved even when their discovery record is stale.
5. Gmail connection credentials are not subject to automatic retention deletion; disconnect is an explicit user-controlled action.
6. A future cleanup runner must support dry-run reporting before enabling destructive execution.
7. No cleanup job should submit applications, send email, activate billing, or mutate application workflow state.

The indexes added in migration `0004_retention_indexes` support these future bounded cleanup queries without changing existing data semantics.
