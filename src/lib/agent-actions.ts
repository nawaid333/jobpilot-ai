export type AgentActionStatus = "pending" | "completed" | "dismissed";

export type AgentAction = {
  id: string;
  userId: string;
  applicationId: string | null;
  signalId: string | null;
  type: string;
  title: string;
  reason: string;
  priority: number;
  status: AgentActionStatus;
  createdAt: Date;
  updatedAt: Date;
};

export function actionKey(input: { applicationId?: string | null; signalId?: string | null; type: string }) {
  return `${input.type}:${input.applicationId || "none"}:${input.signalId || "none"}`;
}

export function canCompleteAction(status: AgentActionStatus) {
  return status === "pending";
}

export function canDismissAction(status: AgentActionStatus) {
  return status === "pending";
}
