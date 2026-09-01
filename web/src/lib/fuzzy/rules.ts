import type { FuzzyInputs, RuleResult } from "./types";
import {
  dlNear, dlMedium, dlFar,
  impLow, impMedium, impHigh,
  difEasy, difMedium, difHard,
  proLow, proMedium, proHigh,
  arLow, arMedium, arHigh, arCritical
} from "./membership";

/**
 * Builds the complete Rule Matrix.
 * Hierarchy: Deadline > Importance > Progress > Difficulty > Academic Risk
 *
 * When deadline is Far (e.g. > 12 days, months away), standard tasks with Normal/Low
 * importance are categorized as Low (Flexible Priority).
 */
export function buildRules(inputs: FuzzyInputs): RuleResult[] {
  const { deadlineDays: dl, importance: imp, difficulty: dif, progress: pro, academicRisk: ar } = inputs;

  // Compute all memberships once
  const dN = dlNear(dl), dM = dlMedium(dl), dF = dlFar(dl);
  const iL = impLow(imp), iM = impMedium(imp), iH = impHigh(imp);
  const diffE = difEasy(dif), diffM = difMedium(dif), diffH = difHard(dif);
  const pL = proLow(pro), pM = proMedium(pro), pH = proHigh(pro);
  const aL = arLow(ar), aM = arMedium(ar), aH = arHigh(ar), aC = arCritical(ar);

  return [
    // ── DEADLINE NEAR ───────────────────────────────────────────────────────
    // If deadline is near, priority is generally Critical or High.
    { id: 1, strength: Math.min(dN, iH), conditions: ["Deadline Near", "Importance High"], conclusion: "Critical", outputLevel: "Critical" },
    { id: 2, strength: Math.min(dN, iM, aC), conditions: ["Deadline Near", "Importance Medium", "Academic Risk Critical"], conclusion: "Critical", outputLevel: "Critical" },
    { id: 3, strength: Math.min(dN, iM, aH), conditions: ["Deadline Near", "Importance Medium", "Academic Risk High"], conclusion: "Critical", outputLevel: "Critical" },
    { id: 4, strength: Math.min(dN, iM), conditions: ["Deadline Near", "Importance Medium"], conclusion: "Critical", outputLevel: "Critical" },

    // Importance Low, but deadline is near
    { id: 5, strength: Math.min(dN, iL, pL), conditions: ["Deadline Near", "Importance Low", "Progress Low"], conclusion: "High", outputLevel: "High" },
    { id: 6, strength: Math.min(dN, iL, pM), conditions: ["Deadline Near", "Importance Low", "Progress Medium"], conclusion: "High", outputLevel: "High" },
    { id: 7, strength: Math.min(dN, iL, pH), conditions: ["Deadline Near", "Importance Low", "Progress High"], conclusion: "Medium", outputLevel: "Medium" },

    // ── DEADLINE MEDIUM ─────────────────────────────────────────────────────
    // If deadline is medium, priority ranges from High to Low.
    
    // Importance High
    { id: 8,  strength: Math.min(dM, iH, pL), conditions: ["Deadline Medium", "Importance High", "Progress Low"], conclusion: "High", outputLevel: "High" },
    { id: 9,  strength: Math.min(dM, iH, pM), conditions: ["Deadline Medium", "Importance High", "Progress Medium"], conclusion: "High", outputLevel: "High" },
    { id: 10, strength: Math.min(dM, iH, pH, aC), conditions: ["Deadline Medium", "Importance High", "Progress High", "Academic Risk Critical"], conclusion: "High", outputLevel: "High" },
    { id: 11, strength: Math.min(dM, iH, pH, aH), conditions: ["Deadline Medium", "Importance High", "Progress High", "Academic Risk High"], conclusion: "High", outputLevel: "High" },
    { id: 12, strength: Math.min(dM, iH, pH, aM), conditions: ["Deadline Medium", "Importance High", "Progress High", "Academic Risk Medium"], conclusion: "Medium", outputLevel: "Medium" },
    { id: 13, strength: Math.min(dM, iH, pH, aL), conditions: ["Deadline Medium", "Importance High", "Progress High", "Academic Risk Low"], conclusion: "Medium", outputLevel: "Medium" },

    // Importance Medium
    { id: 14, strength: Math.min(dM, iM, diffH), conditions: ["Deadline Medium", "Importance Medium", "Difficulty Hard"], conclusion: "High", outputLevel: "High" },
    { id: 15, strength: Math.min(dM, iM, diffM), conditions: ["Deadline Medium", "Importance Medium", "Difficulty Medium"], conclusion: "Medium", outputLevel: "Medium" },
    { id: 16, strength: Math.min(dM, iM, diffE), conditions: ["Deadline Medium", "Importance Medium", "Difficulty Easy"], conclusion: "Medium", outputLevel: "Medium" },

    // Importance Low
    { id: 17, strength: Math.min(dM, iL, aC), conditions: ["Deadline Medium", "Importance Low", "Academic Risk Critical"], conclusion: "Medium", outputLevel: "Medium" },
    { id: 18, strength: Math.min(dM, iL, aH), conditions: ["Deadline Medium", "Importance Low", "Academic Risk High"], conclusion: "Medium", outputLevel: "Medium" },
    { id: 19, strength: Math.min(dM, iL, aM), conditions: ["Deadline Medium", "Importance Low", "Academic Risk Medium"], conclusion: "Low", outputLevel: "Low" },
    { id: 20, strength: Math.min(dM, iL, aL), conditions: ["Deadline Medium", "Importance Low", "Academic Risk Low"], conclusion: "Low", outputLevel: "Low" },

    // ── DEADLINE FAR (Days > 12) ────────────────────────────────────────────
    // Priority is Flexible (Low), unless Importance is High with severe Academic Risk.

    // Importance High
    { id: 21, strength: Math.min(dF, iH, aC), conditions: ["Deadline Far", "Importance High", "Academic Risk Critical"], conclusion: "High", outputLevel: "High" },
    { id: 22, strength: Math.min(dF, iH, aH), conditions: ["Deadline Far", "Importance High", "Academic Risk High"], conclusion: "Medium", outputLevel: "Medium" },
    { id: 23, strength: Math.min(dF, iH, aM), conditions: ["Deadline Far", "Importance High", "Academic Risk Medium"], conclusion: "Medium", outputLevel: "Medium" },
    { id: 24, strength: Math.min(dF, iH, aL), conditions: ["Deadline Far", "Importance High", "Academic Risk Low"], conclusion: "Medium", outputLevel: "Medium" },

    // Importance Medium -> Far deadline makes standard task Flexible (Low)
    { id: 25, strength: Math.min(dF, iM, diffH), conditions: ["Deadline Far", "Importance Medium", "Difficulty Hard"], conclusion: "Medium", outputLevel: "Medium" },
    { id: 26, strength: Math.min(dF, iM, diffM), conditions: ["Deadline Far", "Importance Medium", "Difficulty Medium"], conclusion: "Low", outputLevel: "Low" },
    { id: 27, strength: Math.min(dF, iM, diffE), conditions: ["Deadline Far", "Importance Medium", "Difficulty Easy"], conclusion: "Low", outputLevel: "Low" },

    // Importance Low -> Always Flexible (Low)
    { id: 28, strength: Math.min(dF, iL), conditions: ["Deadline Far", "Importance Low"], conclusion: "Low", outputLevel: "Low" },

    // ── EXTREME CORNER CASES ────────────────────────────────────────────────
    { id: 29, strength: Math.min(aC, pL, dM), conditions: ["Academic Risk Critical", "Progress Low", "Deadline Medium"], conclusion: "High", outputLevel: "High" },
    { id: 30, strength: Math.min(aC, pL, dF), conditions: ["Academic Risk Critical", "Progress Low", "Deadline Far"], conclusion: "High", outputLevel: "High" },
    { id: 31, strength: Math.min(aH, iH), conditions: ["Academic Risk High", "Importance High"], conclusion: "Critical", outputLevel: "Critical" },
    { id: 32, strength: Math.min(aC, iM), conditions: ["Academic Risk Critical", "Importance Medium"], conclusion: "Critical", outputLevel: "Critical" },
  ];
}
