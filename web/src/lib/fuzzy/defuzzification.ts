import { outLow, outMedium, outHigh, outCritical } from "./membership";
import { DEFUZZIFICATION } from "./config";
import type { FuzzyRuleActivation } from "./types";

/**
 * Performs Center of Gravity (Centroid) defuzzification via numerical integration.
 *
 * @param activation The aggregated activation strengths for each level.
 * @returns The defuzzified continuous score [0, 100].
 */
export function defuzzify(activation: FuzzyRuleActivation): number {
  // If no rules fired (should not happen with a complete rule base), default to 0
  if (
    activation.low === 0 &&
    activation.medium === 0 &&
    activation.high === 0 &&
    activation.critical === 0
  ) {
    return 0;
  }

  const dx = (DEFUZZIFICATION.MAX_X - DEFUZZIFICATION.MIN_X) / DEFUZZIFICATION.STEPS;
  let num = 0; // Sum of (x * μ(x) * dx)
  let den = 0; // Sum of (μ(x) * dx)

  for (let i = 0; i <= DEFUZZIFICATION.STEPS; i++) {
    const x = DEFUZZIFICATION.MIN_X + i * dx;

    // 1. Calculate base membership for x in each output linguistic variable
    const valLow = outLow(x);
    const valMed = outMedium(x);
    const valHigh = outHigh(x);
    const valCrit = outCritical(x);

    // 2. Mamdani implication (MIN): clip each MF by its activation strength
    const clipLow = Math.min(valLow, activation.low);
    const clipMed = Math.min(valMed, activation.medium);
    const clipHigh = Math.min(valHigh, activation.high);
    const clipCrit = Math.min(valCrit, activation.critical);

    // 3. Mamdani aggregation (MAX): combine the clipped regions
    const mu = Math.max(clipLow, clipMed, clipHigh, clipCrit);

    // 4. Centroid integration sums
    num += x * mu * dx;
    den += mu * dx;
  }

  return den < 0.001 ? 0 : num / den;
}
