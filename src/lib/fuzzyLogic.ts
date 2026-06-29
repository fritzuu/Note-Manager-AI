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

/**
 * Derive academic risk (0–100) from AI-generated academic insight.
 * Lower academic score + poor prediction label = higher risk.
 */
export function deriveAcademicRiskFromInsight(academicScore: number, prediction: string): number {
  let risk = Math.round(100 - academicScore);
  const label = prediction.toLowerCase();
  if      (label.includes("excellent") || label.includes("very high") || label.includes("high performer"))
    risk = Math.max(0, risk - 20);
  else if (label.includes("above average") || label.includes("good"))
    risk = Math.max(0, risk - 10);
  else if (label.includes("below average") || label.includes("at risk"))
    risk = Math.min(100, risk + 15);
  else if (label.includes("fail") || label.includes("poor") || label.includes("critical"))
    risk = Math.min(100, risk + 25);
  return Math.max(0, Math.min(100, risk));
}
