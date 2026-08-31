/**
 * fuzzy/config.ts
 *
 * Contains all mathematical constants, thresholds, and configuration settings
 * for the Mamdani Fuzzy Priority Engine. This ensures no "magic numbers" exist
 * in the inference and defuzzification logic.
 */

// ── Output Membership Function Parameters ─────────────────────────────────────
// The output space is PriorityScore (0–100).
// We define non-overlapping anchor points to prevent centroid bleeding.
// Adjacent regions have a 2-point overlap maximum for smooth centroid transitions.
//
// These regions ensure that if ONLY a rule for 'Critical' fires, the centroid
// mathematically resolves into the > 80 range without any hardcoded clamping.

export const OUTPUT_MF = {
  LOW: {
    // shoulderL: peak at 0, drops to 0 at 28
    a: 0,
    b: 28,
  },
  MEDIUM: {
    // trap: rises from 26, plateaus 34-54, drops to 0 at 62
    a: 26,
    b: 34,
    c: 54,
    d: 62,
  },
  HIGH: {
    // trap: rises from 60, plateaus 68-78, drops to 0 at 84
    a: 60,
    b: 68,
    c: 78,
    d: 84,
  },
  CRITICAL: {
    // trap: rises from 82, plateaus 88-100, drops at 100
    a: 82,
    b: 88,
    c: 100,
    d: 100,
  },
};

// ── Defuzzification Configuration ─────────────────────────────────────────────

export const DEFUZZIFICATION = {
  /**
   * The number of steps used for numerical integration (centroid method).
   * 600 steps over a range of 0-100 gives an integration step (dx) of ~0.166,
   * providing very high accuracy without significant performance penalty.
   */
  STEPS: 600,
  MIN_X: 0,
  MAX_X: 100,
};

// ── General System Constraints ────────────────────────────────────────────────

export const CONSTRAINTS = {
  MIN_SCORE: 0,
  MAX_SCORE: 100,
};
