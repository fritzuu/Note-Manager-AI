import type { FuzzyInputs, PriorityLevel, RuleResult, RiskLevel } from "./types";

/**
 * Builds a human-readable reasoning string based on the activated rules.
 */
export function buildReasoning(
  inputs: FuzzyInputs,
  priorityLevel: PriorityLevel,
  activatedRules: RuleResult[]
): string {
  if (inputs.progress >= 100) {
    return "Task is fully complete — no action needed.";
  }
  if (inputs.deadlineDays < 0) {
    return "Task is OVERDUE! Immediate action required.";
  }

  if (activatedRules.length === 0) {
    return "No strong priority signals detected.";
  }

  // Find the strongest rule that matches the final output level
  const dominantRule = activatedRules.find(r => r.outputLevel === priorityLevel) || activatedRules[0];

  let reason = `Priority is ${priorityLevel} because ${dominantRule.conditions.join(" and ")}.`;

  if (inputs.progress > 0 && inputs.progress < 100) {
    if (priorityLevel === "Critical" || priorityLevel === "High") {
      reason += ` Progress is at ${inputs.progress.toFixed(0)}%, keep pushing.`;
    }
  }

  return reason;
}

/**
 * Derives a discrete RiskLevel based on fuzzy inputs and final priority score.
 */
export function deriveRiskLevel(
  deadlineDays: number,
  progress: number,
  academicRisk: number,
  priorityScore: number
): RiskLevel {
  if (academicRisk >= 80 || (deadlineDays < 2 && progress < 50)) return "Critical";
  if (priorityScore >= 70 || academicRisk >= 60) return "High";
  if (priorityScore >= 40 || academicRisk >= 35) return "Medium";
  return "Low";
}

/**
 * Estimates required focus minutes based on difficulty and priority.
 */
export function estimateFocusMinutes(difficulty: number, priorityScore: number, progress: number): number {
  if (progress >= 100) return 0;
  
  const remainingMultiplier = (100 - progress) / 100;
  
  // Base minutes on difficulty: Easy (~30m), Medium (~60m), Hard (~120m)
  const baseMinutes = 20 + difficulty * 10;
  
  // Priority multiplier (up to 1.5x for critical tasks)
  const priorityMultiplier = 1.0 + (priorityScore / 200); 

  return Math.round(baseMinutes * priorityMultiplier * remainingMultiplier);
}
