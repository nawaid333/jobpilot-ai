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

## Next evolution

Future work can add explicit daily completion metrics and persistent dismiss/snooze state without changing the selection contract above.
