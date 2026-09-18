# Agent Daily Brief

## Purpose

The Agent Daily Brief turns the existing prioritized Agent action queue into a concise daily plan. It surfaces up to three highest-priority actions without changing application state.

## Selection rules

1. Higher Agent priority wins.
2. When priority ties, the earlier due date wins.
3. Actions without a due date sort after actions with due dates when priority is equal.
4. At most three actions are shown.

## User control

The brief only recommends and surfaces existing Agent actions. Buttons execute the same existing user-controlled Agent actions. JobPilot does not automatically submit applications or send recruiter emails.

Users can dismiss a brief item or snooze it for 24 hours. These preferences are stored in the browser's local storage, so they persist across refreshes on the same browser profile. The full Action Queue remains visible and is not modified by brief preferences.

## Status metrics

The brief displays four client-side status counts for the current action queue:

- **Visible:** actions that are neither dismissed nor actively snoozed.
- **Dismissed:** unique actions explicitly dismissed by the user.
- **Snoozed:** unique actions with a future snooze expiry, excluding dismissed actions.
- **Total:** unique action IDs in the current queue.

These are queue-visibility metrics, not completion or application-outcome metrics. An action being dismissed or snoozed does not change its underlying application state.

## Privacy and limitations

Brief dismiss and snooze preferences are client-side convenience settings. They are not yet synchronized across devices or browsers, and clearing browser storage resets them. No application or recruiting data is written when a user dismisses or snoozes a brief item.

## Next evolution

Future work can add explicit daily completion/outcome metrics and account-level synchronization without changing the selection contract above.
