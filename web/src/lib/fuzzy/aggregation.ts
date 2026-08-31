import type { RuleResult, FuzzyRuleActivation, PriorityLevel } from "./types";

/**
 * Aggregates all evaluated rules into a single activation map for each Priority Level.
 * Uses standard Mamdani MAX aggregation: the activation of a linguistic variable
 * is the maximum strength of all rules that conclude with that variable.
 */
export function aggregateRules(rules: RuleResult[]): FuzzyRuleActivation {
  let low = 0, medium = 0, high = 0, critical = 0;

  for (const r of rules) {
    if (r.outputLevel === "Critical" && r.strength > critical) critical = r.strength;
    if (r.outputLevel === "High" && r.strength > high) high = r.strength;
    if (r.outputLevel === "Medium" && r.strength > medium) medium = r.strength;
    if (r.outputLevel === "Low" && r.strength > low) low = r.strength;
  }

  return { low, medium, high, critical };
}

/**
 * Derives the dominant priority level based purely on the highest activation.
 * Since the rule base is carefully constructed, we can use simple Argmax.
 * If there's a tie, we bias towards the more urgent priority.
 */
export function argmaxLevel(act: FuzzyRuleActivation): PriorityLevel {
  let best: PriorityLevel = "Low";
  let maxVal = act.low;

  if (act.medium > maxVal) { best = "Medium"; maxVal = act.medium; }
  if (act.high > maxVal) { best = "High"; maxVal = act.high; }
  // Tie-breaker goes to Critical if they are equal, to preserve urgency
  if (act.critical >= maxVal && act.critical > 0) { best = "Critical"; }

  return best;
}
