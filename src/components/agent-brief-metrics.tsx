import type { AgentBriefMetrics } from "@/lib/agent-brief-metrics";

type AgentBriefMetricsProps = {
  metrics: AgentBriefMetrics;
};

export function AgentBriefMetrics({ metrics }: AgentBriefMetricsProps) {
  return (
    <div className="trust-points" aria-label="Daily Brief status summary">
      <span>Visible: {metrics.visible}</span>
      <span>Dismissed: {metrics.dismissed}</span>
      <span>Snoozed: {metrics.snoozed}</span>
      <span>Total: {metrics.total}</span>
    </div>
  );
}
