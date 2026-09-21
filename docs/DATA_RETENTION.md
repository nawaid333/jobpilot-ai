# JobPilot AI Data Retention Contract

This document defines the production retention boundary for operational data. The cleanup runner is intentionally dry-run by default and requires an explicit protected maintenance configuration before destructive execution is possible.

## Retention targets

| Data | Retention target | Cleanup key |
| --- | --- | --- |
| Expired sessions | Delete after `expiresAt` | `Session.expiresAt` |
| Email intelligence signals | 180 days after `createdAt` | `EmailSignal.createdAt` |
| AI usage ledger | 24 completed calendar months | `AiUsage.month` (`YYYY-MM`) |
| Stale global job records | 365 days after `lastSeenAt`, only when no application references the job | `Job.lastSeenAt` |

## Safety rules

1. Cleanup must run server-side with a dedicated operational identity or protected maintenance job.
2. Cleanup is bounded by `RETENTION_CLEANUP_BATCH_SIZE` (default `100`, maximum `1000`).
3. User-owned application data must never be deleted solely because it is old.
4. Jobs referenced by an application must be preserved even when their discovery record is stale.
5. Gmail connection credentials are not subject to automatic retention deletion; disconnect is an explicit user-controlled action.
6. Cleanup defaults to dry-run. Destructive execution requires `--execute`, `RETENTION_CLEANUP_ENABLED=true`, and matching protected maintenance credentials in `RETENTION_CLEANUP_TOKEN` and `RETENTION_CLEANUP_EXPECTED_TOKEN`.
7. Cleanup re-checks each retention predicate at deletion time to avoid deleting records that became active after candidate selection.
8. No cleanup job should submit applications, send email, activate billing, or mutate application workflow state.

## Maintenance command

`npm run retention:cleanup` performs one bounded dry-run and reports candidate counts without deleting data.

`RETENTION_CLEANUP_ENABLED=true RETENTION_CLEANUP_TOKEN=... RETENTION_CLEANUP_EXPECTED_TOKEN=... npm run retention:cleanup -- --execute` enables one bounded destructive run. The command must be invoked by a protected maintenance environment; the application itself does not schedule or invoke it automatically.

The runner is deliberately one-batch-per-run. A scheduler can repeat it later, but each invocation remains bounded and independently auditable.

The indexes added in migration `0004_retention_indexes` support these bounded cleanup queries without changing existing data semantics.
