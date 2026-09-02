export type ApplicationEmailSignal = {
  category: "application_received" | "assessment" | "interview" | "rejection" | "offer" | "other";
  confidence: number;
  suggestedStatus: "Preparing" | "Applied" | "Interview" | "Rejected" | "Offer" | null;
  reason: string;
};

const rules: Array<{ category: ApplicationEmailSignal["category"]; status: ApplicationEmailSignal["suggestedStatus"]; words: string[]; reason: string }> = [
  { category: "offer", status: "Offer", words: ["offer", "congratulations", "pleased to offer"], reason: "The message appears to contain an offer signal." },
  { category: "interview", status: "Interview", words: ["interview", "schedule a call", "next round", "meet the team", "phone screen"], reason: "The message appears to indicate an interview or next-round step." },
  { category: "rejection", status: "Rejected", words: ["unfortunately", "not moving forward", "other candidates", "rejected", "decline"], reason: "The message appears to communicate a rejection or closed application." },
  { category: "assessment", status: "Applied", words: ["assessment", "coding challenge", "online test", "complete the test"], reason: "The message appears to contain an application assessment step." },
  { category: "application_received", status: "Applied", words: ["application received", "received your application", "thank you for applying", "application confirmation", "application submitted"], reason: "The message appears to confirm that an application was received." },
];

export function classifyApplicationEmail(subject: string, body: string): ApplicationEmailSignal {
  const text = `${subject} ${body}`.toLowerCase();
  for (const rule of rules) {
    const hits = rule.words.filter(word => text.includes(word)).length;
    if (hits) return { category: rule.category, suggestedStatus: rule.status, confidence: Math.min(0.98, 0.72 + hits * 0.08), reason: rule.reason };
  }
  return { category: "other", suggestedStatus: null, confidence: 0, reason: "No strong application-status signal was detected." };
}

export function normalizeCompanySignal(subject: string, body: string) {
  const text = `${subject} ${body}`;
  const from = text.match(/(?:from|at|@)\s+([A-Z][A-Za-z0-9&. -]{2,50})/);
  return from?.[1]?.trim() || null;
}
