/**
 * fuzzyLogic.ts — Legacy entry point for backwards compatibility.
 * The engine has been refactored into `src/lib/fuzzy/`.
 */

export { computePriority, computePriorityDetailed, deadlineToDays } from "./fuzzy/inference";
export type { FuzzyInputs, PriorityLevel, RiskLevel, FuzzyResult, FuzzyDetailedResult, RuleResult, FuzzyMemberships, FuzzyRuleActivation } from "./fuzzy/types";
export { OUTPUT_MF, DEFUZZIFICATION, CONSTRAINTS } from "./fuzzy/config";
export { buildRules } from "./fuzzy/rules";
export { aggregateRules, argmaxLevel } from "./fuzzy/aggregation";
export { defuzzify } from "./fuzzy/defuzzification";
export { buildReasoning, deriveRiskLevel, estimateFocusMinutes } from "./fuzzy/reasoning";

/** A bounded secondary profile signal; label wording and provider do not change it. */
export function deriveAcademicRiskFromInsight(academicScore?: number | null, _prediction?: string | null): number {
  if (typeof academicScore !== "number" || !Number.isFinite(academicScore)) return 40;
  const score = Math.max(0, Math.min(100, academicScore));
  return Math.round(Math.max(20, Math.min(70, 40 + (60 - score) * 0.5)));
}
