# JobPilot Agent Workflow

JobPilot's agent is designed as a guided, state-aware workflow rather than an unrestricted auto-apply bot.

1. **Match** — evaluate the opportunity against the candidate profile and preferences.
2. **Tailor** — generate a truthful application package from the saved job and profile.
3. **Review** — let the candidate inspect generated resume edits, summary, cover letter, and missing requirements.
4. **Apply** — open the employer's listing and let the candidate complete and confirm submission.
5. **Track** — record the application as Applied and keep its state in the tracker.
6. **Monitor** — use recruiting email signals to surface interviews, assessments, offers, rejections, or ambiguous matches.

The agent should always preserve explicit user control over employer submissions and outbound email. It can recommend and prepare work, but it should not silently submit applications or send messages.
