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

export type AgentActionInput = {
  userId: string;
  applicationId?: string | null;
  signalId?: string | null;
  type: string;
  title: string;
  reason: string;
  priority: number;
};

export function actionKey(input: Pick<AgentActionInput, "applicationId" | "signalId" | "type">) {
  return `${input.type}:${input.applicationId || "none"}:${input.signalId || "none"}`;
}

export function canCompleteAction(status: AgentActionStatus) {
  return status === "pending";
}

export function canDismissAction(status: AgentActionStatus) {
  return status === "pending";
}

export function isTerminal(status: AgentActionStatus) {
  return status === "completed" || status === "dismissed";
}
