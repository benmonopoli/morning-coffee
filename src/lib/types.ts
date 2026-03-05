export interface CoffeeRecipeStep {
  stage: string;
  detail: string;
  time: string;
}

export interface CoffeeRecipe {
  name: string;
  equipment: string;
  coffee: string;
  grind: string;
  water: string;
  ratio: string;
  steps: CoffeeRecipeStep[];
  tip: string;
}

export interface CoffeeTip {
  type: "tip" | "fact";
  text: string;
}

export interface CandidateAnalysis {
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendation: "Strong Progress" | "Progress" | "Maybe" | "Reject";
  reasoning: string;
  fake_likelihood: "low" | "medium" | "high";
}

export interface CandidateData {
  name: string;
  candidate_id: number;
  application_id: number;
  job_id: number;
  role: string;
  source: string;
  current_stage_id: number;
  current_stage_name: string;
  analysis: CandidateAnalysis;
  geo_excluded: boolean | "undetermined";
  geo_detail: string;
  geo_source: string;
  repeat_rejected: boolean;
  repeat_count: number;
  reject_flag: FlagType | null;
}

export type FlagType = "geo" | "repeat" | "fake" | "ai_reject" | "location_unknown";

export interface RoleResults {
  job_id: number;
  candidates: CandidateData[];
}

export type ResultsByRole = Record<string, RoleResults>;

export interface SelectedState {
  progress: Set<number>;
  reject: Set<number>;
}

export interface BatchDoneState {
  progress: Set<number>;
  reject: Set<number>;
}

export const FLAG_LABELS: Record<FlagType, { icon: string; label: string }> = {
  geo: { icon: "🌍", label: "Geo excluded" },
  repeat: { icon: "🔄", label: "Repeat rejected" },
  fake: { icon: "🤖", label: "Fake signals" },
  ai_reject: { icon: "❌", label: "Not a fit" },
  location_unknown: { icon: "❓", label: "Location undetermined" },
};

export const TIERS = ["Strong Progress", "Progress", "Maybe", "Reject"] as const;

export const tierRank = (c: CandidateData): number => {
  const r = c.analysis?.recommendation || "Maybe";
  const i = TIERS.indexOf(r as typeof TIERS[number]);
  return i >= 0 ? i : 99;
};
