import type { FuzzyInputs, FuzzyDetailedResult, FuzzyMemberships } from "./types";
import { CONSTRAINTS } from "./config";
import { buildRules } from "./rules";
import { aggregateRules, argmaxLevel } from "./aggregation";
import { defuzzify } from "./defuzzification";
import { buildReasoning, deriveRiskLevel, estimateFocusMinutes } from "./reasoning";
import {
  dlNear, dlMedium, dlFar,
  impLow, impMedium, impHigh,
  difEasy, difMedium, difHard,
  proLow, proMedium, proHigh,
  arLow, arMedium, arHigh, arCritical
} from "./membership";

/**
 * Computes the final priority score, level, and detailed reasoning based purely
 * on standard Mamdani Fuzzy Inference without hardcoded semantic vetos.
 */
export function computePriorityDetailed(inputs: FuzzyInputs): FuzzyDetailedResult {
  // 1. Clamp inputs to safe ranges
  const dl  = Math.max(-30, inputs.deadlineDays);
  const imp = Math.max(1, Math.min(10, inputs.importance));
  const dif = Math.max(1, Math.min(10, inputs.difficulty));
  const pro = Math.max(0, Math.min(100, inputs.progress));
  const ar  = Math.max(0, Math.min(100, inputs.academicRisk));

  // Overdue tasks are processed as having 0 days remaining during inference
  const dlForMF = Math.max(0, dl);
  const clampedInputs = { deadlineDays: dlForMF, importance: imp, difficulty: dif, progress: pro, academicRisk: ar };

  // Short-circuit if fully complete
  if (pro >= 100) {
    return {
      priorityScore: 0,
      priorityLevel: "Low",
      riskLevel: "Low",
      estimatedTotalMinutes: 0,
      reasoning: "Task is fully complete — no action needed.",
      activatedRules: [],
      activation: { low: 1, medium: 0, high: 0, critical: 0 },
      memberships: getMemberships(clampedInputs)
    };
  }

  // 2. Fuzzification & Rule Evaluation
  const rules = buildRules(clampedInputs);

  // 3. Aggregation (MAX)
  const activation = aggregateRules(rules);

  // 4. Defuzzification (Centroid)
  const baseDefuzzValue = defuzzify(activation);

  // 5. Global Modifications (Overdue bonus + Progress penalty)
  let finalScore = baseDefuzzValue;

  // Overdue bonus: Add up to 10 points
  if (dl < 0) {
    finalScore += Math.min(10, Math.abs(dl) * 2);
  }

  // Progress penalty (global adjustment independent of rules)
  // High progress reduces urgency linearly; low progress slightly amplifies it
  if (pro > 90) {
    finalScore -= (pro - 90);
  } else if (pro < 10) {
    finalScore += (10 - pro) * 0.5;
  }

  // Final clamping to [0, 100]
  finalScore = Math.round(Math.min(CONSTRAINTS.MAX_SCORE, Math.max(CONSTRAINTS.MIN_SCORE, finalScore)));

  // 6. Level Determination via Argmax
  // Since the rule base is partitioned carefully, argmax matches human intuition.
  const priorityLevel = argmaxLevel(activation);

  // Filter rules for debugging/UI
  const activatedRules = rules
    .filter(r => r.strength > 0.01)
    .sort((a, b) => b.strength - a.strength);

  const riskLevel = deriveRiskLevel(dl, pro, ar, finalScore);
  const estimatedTotalMinutes = estimateFocusMinutes(dif, finalScore, pro);
  const reasoning = buildReasoning(
    { deadlineDays: dl, importance: imp, difficulty: dif, progress: pro, academicRisk: ar },
    priorityLevel, activatedRules
  );

  return {
    priorityScore: finalScore,
    priorityLevel,
    riskLevel,
    estimatedTotalMinutes,
    reasoning,
    activatedRules,
    activation,
    memberships: getMemberships(clampedInputs)
  };
}

/**
 * Convenience wrapper returning only standard FuzzyResult.
 */
export function computePriority(inputs: FuzzyInputs) {
  const detailed = computePriorityDetailed(inputs);
  return {
    priorityScore: detailed.priorityScore,
    priorityLevel: detailed.priorityLevel,
    riskLevel: detailed.riskLevel,
    estimatedTotalMinutes: detailed.estimatedTotalMinutes,
    reasoning: detailed.reasoning
  };
}

/**
 * Collects all membership values for debugging.
 */
function getMemberships(inputs: FuzzyInputs): FuzzyMemberships {
  return {
    deadline: { near: dlNear(inputs.deadlineDays), medium: dlMedium(inputs.deadlineDays), far: dlFar(inputs.deadlineDays) },
    importance: { low: impLow(inputs.importance), medium: impMedium(inputs.importance), high: impHigh(inputs.importance) },
    difficulty: { easy: difEasy(inputs.difficulty), medium: difMedium(inputs.difficulty), hard: difHard(inputs.difficulty) },
    progress: { low: proLow(inputs.progress), medium: proMedium(inputs.progress), high: proHigh(inputs.progress) },
    academicRisk: { low: arLow(inputs.academicRisk), medium: arMedium(inputs.academicRisk), high: arHigh(inputs.academicRisk), critical: arCritical(inputs.academicRisk) }
  };
}

/** Convert a JS Date deadline to days-until (negative = overdue). */
export function deadlineToDays(deadline: Date): number {
  return (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
}
