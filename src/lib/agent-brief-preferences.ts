export type AgentBriefPreferenceState = {
  dismissed: string[];
  snoozedUntil: Record<string, string>;
};

export const DEFAULT_AGENT_BRIEF_PREFERENCES: AgentBriefPreferenceState = {
  dismissed: [],
  snoozedUntil: {},
};

const MAX_PREFERENCE_IDS = 500;
const MAX_ID_LENGTH = 200;

export function normalizeAgentBriefPreferences(value: unknown): AgentBriefPreferenceState {
  if (!value || typeof value !== "object") return DEFAULT_AGENT_BRIEF_PREFERENCES;
  const parsed = value as Partial<AgentBriefPreferenceState>;
  const dismissed = Array.isArray(parsed.dismissed)
    ? Array.from(new Set(parsed.dismissed.filter((item): item is string => typeof item === "string" && item.length > 0 && item.length <= MAX_ID_LENGTH))).slice(0, MAX_PREFERENCE_IDS)
    : [];
  const snoozedUntil: Record<string, string> = {};
  if (parsed.snoozedUntil && typeof parsed.snoozedUntil === "object") {
    for (const [key, value] of Object.entries(parsed.snoozedUntil)) {
      if (key.length > MAX_ID_LENGTH || typeof value !== "string") continue;
      const timestamp = new Date(value).getTime();
      if (Number.isFinite(timestamp) && timestamp > Date.now()) snoozedUntil[key] = new Date(timestamp).toISOString();
      if (Object.keys(snoozedUntil).length >= MAX_PREFERENCE_IDS) break;
    }
  }
  return { dismissed, snoozedUntil };
}

export function readAgentBriefPreferences(raw: string | null): AgentBriefPreferenceState {
  if (!raw) return DEFAULT_AGENT_BRIEF_PREFERENCES;
  try { return normalizeAgentBriefPreferences(JSON.parse(raw)); } catch { return DEFAULT_AGENT_BRIEF_PREFERENCES; }
}

export function isAgentBriefHidden(actionId: string, state: AgentBriefPreferenceState, now = new Date()): boolean {
  if (state.dismissed.includes(actionId)) return true;
  const snoozedUntil = state.snoozedUntil[actionId];
  if (!snoozedUntil) return false;
  const timestamp = new Date(snoozedUntil).getTime();
  return Number.isFinite(timestamp) && timestamp > now.getTime();
}

export function dismissAgentBriefAction(state: AgentBriefPreferenceState, actionId: string): AgentBriefPreferenceState {
  return {
    dismissed: Array.from(new Set([...state.dismissed, actionId])),
    snoozedUntil: Object.fromEntries(Object.entries(state.snoozedUntil).filter(([key]) => key !== actionId)),
  };
}

export function snoozeAgentBriefAction(state: AgentBriefPreferenceState, actionId: string, until: Date): AgentBriefPreferenceState {
  return {
    dismissed: state.dismissed.filter((id) => id !== actionId),
    snoozedUntil: { ...state.snoozedUntil, [actionId]: until.toISOString() },
  };
}
