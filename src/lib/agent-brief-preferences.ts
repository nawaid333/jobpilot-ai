export type AgentBriefPreferenceState = {
  dismissed: string[];
  snoozedUntil: Record<string, string>;
};

export const DEFAULT_AGENT_BRIEF_PREFERENCES: AgentBriefPreferenceState = {
  dismissed: [],
  snoozedUntil: {},
};

export function readAgentBriefPreferences(raw: string | null): AgentBriefPreferenceState {
  if (!raw) return DEFAULT_AGENT_BRIEF_PREFERENCES;

  try {
    const parsed = JSON.parse(raw) as Partial<AgentBriefPreferenceState>;
    const dismissed = Array.isArray(parsed.dismissed)
      ? parsed.dismissed.filter((value): value is string => typeof value === "string")
      : [];
    const snoozedUntil = parsed.snoozedUntil && typeof parsed.snoozedUntil === "object"
      ? Object.fromEntries(
          Object.entries(parsed.snoozedUntil).filter(
            ([key, value]) => typeof key === "string" && typeof value === "string",
          ),
        )
      : {};

    return { dismissed, snoozedUntil };
  } catch {
    return DEFAULT_AGENT_BRIEF_PREFERENCES;
  }
}

export function isAgentBriefHidden(
  actionId: string,
  state: AgentBriefPreferenceState,
  now = new Date(),
): boolean {
  if (state.dismissed.includes(actionId)) return true;
  const snoozedUntil = state.snoozedUntil[actionId];
  if (!snoozedUntil) return false;
  const timestamp = new Date(snoozedUntil).getTime();
  return Number.isFinite(timestamp) && timestamp > now.getTime();
}

export function dismissAgentBriefAction(
  state: AgentBriefPreferenceState,
  actionId: string,
): AgentBriefPreferenceState {
  return {
    dismissed: Array.from(new Set([...state.dismissed, actionId])),
    snoozedUntil: Object.fromEntries(
      Object.entries(state.snoozedUntil).filter(([key]) => key !== actionId),
    ),
  };
}

export function snoozeAgentBriefAction(
  state: AgentBriefPreferenceState,
  actionId: string,
  until: Date,
): AgentBriefPreferenceState {
  return {
    dismissed: state.dismissed.filter((id) => id !== actionId),
    snoozedUntil: { ...state.snoozedUntil, [actionId]: until.toISOString() },
  };
}
