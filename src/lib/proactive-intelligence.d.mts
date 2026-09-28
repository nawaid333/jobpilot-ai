export type ProactiveInsight = {
  id: string;
  type: "stale-application" | "follow-up-due" | "recruiter-signal" | "interview-prep" | "tailor-needed";
  priority: number;
  title: string;
  reason: string;
  evidence: string[];
  applicationId: string;
};

export function buildProactiveInsights(
  applications: Array<{
    id: string;
    status: string;
    appliedAt: Date | null;
    updatedAt: Date;
    followUpDueAt: Date | null;
    tailoredApplication?: unknown | null;
    job: { title: string; company: string };
  }>,
  signals: Array<{
    id: string;
    applicationId: string | null;
    category: string;
    applied: boolean;
    reason: string;
    receivedAt: Date | null;
  }>,
  now?: Date
): ProactiveInsight[];
