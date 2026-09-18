import type { AgentBriefMetrics } from "@/lib/agent-brief-metrics";

type AgentBriefMetricsProps = {
  metrics: AgentBriefMetrics;
};

export function AgentBriefMetrics({ metrics }: AgentBriefMetricsProps) {
  return (
    <dl className="trust-points" aria-label="Daily Brief status summary">
      <div>
        <dt>Visible</dt>
        <dd>{metrics.visible}</dd>
      </div>
      <div>
        <dt>Dismissed</dt>
        <dd>{metrics.dismissed}</dd>
      </div>
      <div>
        <dt>Snoozed</dt>
        <dd>{metrics.snoozed}</dd>
      </div>
      <div>
        <dt>Total</dt>
        <dd>{metrics.total}</dd>
      </div>
    </dl>
  );
}
