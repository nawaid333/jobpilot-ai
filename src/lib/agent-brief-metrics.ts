import type { AgentBriefPreferenceState } from "@/lib/agent-brief-preferences";

export type AgentBriefMetrics = {
  total: number;
  visible: number;
  dismissed: number;
  snoozed: number;
};

export function getAgentBriefMetrics(
  actionIds: string[],
  state: AgentBriefPreferenceState,
  now = new Date(),
): AgentBriefMetrics {
  const uniqueIds = Array.from(new Set(actionIds));
  const dismissed = uniqueIds.filter((id) => state.dismissed.includes(id));
  const snoozed = uniqueIds.filter((id) => {
    if (state.dismissed.includes(id)) return false;
    const timestamp = new Date(state.snoozedUntil[id] ?? "").getTime();
    return Number.isFinite(timestamp) && timestamp > now.getTime();
  });

  return {
    total: uniqueIds.length,
    visible: uniqueIds.length - dismissed.length - snoozed.length,
    dismissed: dismissed.length,
    snoozed: snoozed.length,
  };
}
