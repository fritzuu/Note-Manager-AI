export interface FuzzyInputs {
  /** Days until deadline (negative = overdue). */
  deadlineDays: number;
  /** Task importance 1–10. */
  importance: number;
  /** Task difficulty 1–10. */
  difficulty: number;
  /** Current completion 0–100 %. */
  progress: number;
  /** AI-derived academic risk 0–100. */
  academicRisk: number;
}

export type PriorityLevel = "Low" | "Medium" | "High" | "Critical";
export type RiskLevel     = "Low" | "Medium" | "High" | "Critical";

export interface FuzzyRuleActivation {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface RuleResult {
  id: number;
  strength: number;
  conditions: string[];
  conclusion: string;
  outputLevel: PriorityLevel;
}

export interface FuzzyMemberships {
  deadline: { near: number; medium: number; far: number };
  importance: { low: number; medium: number; high: number };
  difficulty: { easy: number; medium: number; hard: number };
  progress: { low: number; medium: number; high: number };
  academicRisk: { low: number; medium: number; high: number; critical: number };
}

export interface FuzzyResult {
  priorityScore: number;
  priorityLevel: PriorityLevel;
  riskLevel: RiskLevel;
  estimatedTotalMinutes: number;
  reasoning: string;
}

export interface FuzzyDetailedResult extends FuzzyResult {
  activatedRules: RuleResult[];
  memberships: FuzzyMemberships;
  activation: FuzzyRuleActivation;
}
