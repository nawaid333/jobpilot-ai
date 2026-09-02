export type ResumeTemplateId = "classic" | "modern" | "compact";

export type ResumeTemplate = {
  id: ResumeTemplateId;
  name: string;
  description: string;
  bestFor: string;
};

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  { id: "classic", name: "Classic ATS", description: "Traditional one-column layout with strong section hierarchy.", bestFor: "Corporate, operations, finance and general applications" },
  { id: "modern", name: "Modern Professional", description: "Clean contemporary hierarchy with a stronger headline and visual rhythm.", bestFor: "Tech, SaaS, project and product roles" },
  { id: "compact", name: "Executive Compact", description: "Dense, polished one-column layout designed to keep senior profiles concise.", bestFor: "Manager, lead and experienced professional roles" },
];

export function isResumeTemplateId(value: string | null | undefined): value is ResumeTemplateId {
  return value === "classic" || value === "modern" || value === "compact";
}
