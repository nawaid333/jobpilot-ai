export type JobMatchInput = {
  title: string;
  company?: string;
  location?: string;
  mode?: string | null;
  level?: string | null;
  description?: string | null;
  skills?: unknown;
};

export type CandidateMatchProfile = {
  skills?: unknown;
  targetRoles?: unknown;
  location?: string | null;
  experience?: unknown;
};

export type JobMatchResult = {
  score: number;
  recommendation: "Apply" | "Consider" | "Skip";
  matchedSkills: string[];
  missingSkills: string[];
  matchedSignals: string[];
};

const SKILL_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  node: "node.js",
  nodejs: "node.js",
  reactjs: "react",
  nextjs: "next.js",
  postgres: "postgresql",
  postgresql: "postgresql",
  ms_excel: "excel",
  "microsoft excel": "excel",
  "power bi": "powerbi",
};

function normalize(value: string) {
  const key = value.toLowerCase().replace(/[._/-]+/g, " ").replace(/\s+/g, " ").trim();
  return SKILL_ALIASES[key] ?? key;
}

function asStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function unique(values: string[]) {
  return [...new Set(values.map(normalize).filter(Boolean))];
}

function containsSignal(text: string, value: string) {
  const normalizedText = normalize(text);
  const normalizedValue = normalize(value);
  return normalizedText.includes(normalizedValue);
}

function extractJobSkills(job: JobMatchInput): string[] {
  const explicit = asStrings(job.skills);
  if (explicit.length) return unique(explicit).slice(0, 30);

  const text = `${job.title} ${job.description ?? ""}`.toLowerCase();
  const known = Object.values(SKILL_ALIASES).concat([
    "python", "java", "c++", "sql", "aws", "azure", "gcp", "docker", "kubernetes",
    "git", "github", "jira", "figma", "tableau", "salesforce", "excel", "powerbi",
    "machine learning", "data analysis", "project management", "stakeholder management",
  ]);
  return unique(known.filter(skill => text.includes(skill.toLowerCase()))).slice(0, 30);
}

function roleMatch(title: string, targetRoles: string[]) {
  if (!targetRoles.length) return 0;
  const titleText = normalize(title);
  return targetRoles.some(role => {
    const words = normalize(role).split(" ").filter(word => word.length > 2);
    return words.length > 0 && words.some(word => titleText.includes(word));
  }) ? 1 : 0;
}

function locationMatch(jobLocation: string, candidateLocation: string | null | undefined) {
  if (!candidateLocation || !jobLocation) return 0;
  const job = normalize(jobLocation);
  const candidate = normalize(candidateLocation);
  return job.includes(candidate) || candidate.includes(job) ? 1 : 0;
}

export function calculateJobMatch(job: JobMatchInput, profile: CandidateMatchProfile): JobMatchResult {
  const candidateSkills = unique(asStrings(profile.skills));
  const requiredSkills = extractJobSkills(job);
  const matchedSkills = requiredSkills.filter(skill => candidateSkills.includes(skill));
  const missingSkills = requiredSkills.filter(skill => !candidateSkills.includes(skill));

  const skillScore = requiredSkills.length ? matchedSkills.length / requiredSkills.length : 0.5;
  const roleScore = roleMatch(job.title, unique(asStrings(profile.targetRoles)));
  const locationScore = locationMatch(job.location ?? "", profile.location);

  const score = Math.round(Math.max(0, Math.min(100,
    skillScore * 70 + roleScore * 20 + locationScore * 10
  )));

  const matchedSignals: string[] = [];
  if (matchedSkills.length) matchedSignals.push(`${matchedSkills.length} relevant skill${matchedSkills.length === 1 ? "" : "s"} matched`);
  if (roleScore) matchedSignals.push("Target role match");
  if (locationScore) matchedSignals.push("Location match");

  const recommendation = score >= 80 ? "Apply" : score >= 60 ? "Consider" : "Skip";

  return { score, recommendation, matchedSkills, missingSkills, matchedSignals };
}

export function rankJobs<T extends JobMatchInput>(jobs: T[], profile: CandidateMatchProfile) {
  return jobs
    .map(job => ({ job, match: calculateJobMatch(job, profile) }))
    .sort((a, b) => b.match.score - a.match.score);
}
