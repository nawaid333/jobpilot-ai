const DAY = 86_400_000;

export function buildProactiveInsights(
  applications,
  signals,
  now = new Date()
) {
  const insights = [];

  for (const app of applications) {
    const matchingSignals = signals.filter((signal) => signal.applicationId === app.id);
    const latestSignal = matchingSignals
      .slice()
      .sort((a, b) => (b.receivedAt?.getTime() ?? 0) - (a.receivedAt?.getTime() ?? 0))[0];

    if (app.status === "Applied" && app.appliedAt) {
      const ageDays = Math.floor((now.getTime() - app.appliedAt.getTime()) / DAY);
      const latestSignalAge = latestSignal?.receivedAt
        ? Math.floor((now.getTime() - latestSignal.receivedAt.getTime()) / DAY)
        : null;
      if (ageDays >= 7 && (latestSignalAge === null || latestSignalAge >= 7)) {
        insights.push({
          id: `stale-${app.id}`,
          type: "stale-application",
          priority: 4,
          title: `No recent update from ${app.job.company}`,
          reason: `This application has been Applied for ${ageDays} days without a recent recruiting signal.`,
          evidence: [
            `Applied ${ageDays} days ago`,
            latestSignalAge === null ? "No matched recruiter signal" : `Last matched signal ${latestSignalAge} days ago`,
          ],
          applicationId: app.id,
        });
      }
    }

    if (app.followUpDueAt && app.followUpDueAt.getTime() <= now.getTime()) {
      insights.push({
        id: `due-${app.id}`,
        type: "follow-up-due",
        priority: app.followUpDueAt.getTime() < now.getTime() - DAY ? 5 : 4,
        title: app.followUpDueAt.getTime() < now.getTime() - DAY
          ? `Follow-up overdue at ${app.job.company}`
          : `Follow-up due at ${app.job.company}`,
        reason: "A follow-up date is recorded in your tracker and now needs review.",
        evidence: [`Due ${app.followUpDueAt.toISOString()}`],
        applicationId: app.id,
      });
    }

    if (latestSignal && !latestSignal.applied && ["interview", "assessment", "offer"].includes(latestSignal.category)) {
      insights.push({
        id: `signal-${latestSignal.id}`,
        type: "recruiter-signal",
        priority: latestSignal.category === "offer" ? 5 : 4,
        title: `Recruiter signal: ${latestSignal.category.replaceAll("_", " ")}`,
        reason: latestSignal.reason,
        evidence: [
          latestSignal.receivedAt ? `Received ${latestSignal.receivedAt.toISOString()}` : "Received time unavailable",
          "Tracker update still requires your approval",
        ],
        applicationId: app.id,
      });
    }

    if (app.status === "Interview") {
      insights.push({
        id: `interview-${app.id}`,
        type: "interview-prep",
        priority: 5,
        title: `Prepare for ${app.job.company}`,
        reason: "Your tracker shows an active interview stage.",
        evidence: [`Role: ${app.job.title}`, "Interview stage is active"],
        applicationId: app.id,
      });
    }

    if ((app.status === "Saved" || app.status === "Preparing") && !app.tailoredApplication) {
      insights.push({
        id: `tailor-${app.id}`,
        type: "tailor-needed",
        priority: 2,
        title: `Prepare your ${app.job.company} application`,
        reason: "A tailored application package has not been created for this saved opportunity.",
        evidence: [`Role: ${app.job.title}`, `Current stage: ${app.status}`],
        applicationId: app.id,
      });
    }
  }

  return insights
    .sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title))
    .slice(0, 10);
}
