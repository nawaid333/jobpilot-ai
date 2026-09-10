# Gmail Signals Review

The Gmail Signals review page is available at `/signals` and is intended to be linked from authenticated product navigation.

## Review flow

1. Load `GET /api/gmail/signals`.
2. Show signals that need review separately from signals already applied.
3. For an ambiguous signal, choose an application and call `PATCH /api/gmail/signals` with `signalId` and `applicationId`.
4. After a successful match, refresh the signal list.

The API remains the source of truth for user ownership and prevents a signal from being manually matched twice.
