import { OUTPUT_MF } from "./config";

// ── Primitive MF helpers ──────────────────────────────────────────────────────

/** Triangular membership function */
export function tri(x: number, a: number, b: number, c: number): number {
  if (x <= a || x >= c) return 0;
  if (x <= b) return (x - a) / (b - a);
  return (c - x) / (c - b);
}

/** Trapezoidal membership function */
export function trap(x: number, a: number, b: number, c: number, d: number): number {
  if (x <= a || x >= d) return 0;
  if (x >= b && x <= c) return 1;
  if (x < b) return (x - a) / (b - a);
  return (d - x) / (d - c);
}

/** Left-shoulder (high near 0, drops to 0 at b) */
export function shoulderL(x: number, a: number, b: number): number {
  if (x <= a) return 1;
  if (x >= b) return 0;
  return (b - x) / (b - a);
}

/** Right-shoulder (0 near a, rises to 1 at b) */
export function shoulderR(x: number, a: number, b: number): number {
  if (x <= a) return 0;
  if (x >= b) return 1;
  return (x - a) / (b - a);
}

// ── Input 1: Deadline (days remaining, clamped 0–30) ─────────────────────────
// Deadline monotonicity constraint: Deadline ↓ = Priority ↑
export function dlNear(d: number): number   { return shoulderL(d, 1, 6); }
export function dlMedium(d: number): number { return trap(d, 4, 7, 12, 18); }
export function dlFar(d: number): number    { return shoulderR(d, 14, 23); }

// ── Input 2: Importance (1–10) ────────────────────────────────────────────────
// Importance monotonicity constraint: Importance ↑ = Priority ↑
export function impLow(v: number): number    { return shoulderL(v, 2, 5); }
export function impMedium(v: number): number { return trap(v, 3.5, 5, 7.5, 9); }
export function impHigh(v: number): number   { return shoulderR(v, 7, 9.5); }

// ── Input 3: Difficulty (1–10) ────────────────────────────────────────────────
// Difficulty monotonicity constraint: Difficulty ↑ = Priority ↑
export function difEasy(v: number): number   { return shoulderL(v, 2, 5); }
export function difMedium(v: number): number { return trap(v, 3, 5, 7, 9); }
export function difHard(v: number): number   { return shoulderR(v, 7, 10); }

// ── Input 4: Progress (0–100 %) ───────────────────────────────────────────────
// Progress monotonicity constraint: Progress ↑ = Priority ↓
export function proLow(v: number): number    { return shoulderL(v, 5, 35); }
export function proMedium(v: number): number { return trap(v, 25, 38, 62, 78); }
export function proHigh(v: number): number   { return shoulderR(v, 65, 90); }

// ── Input 5: Academic Risk (0–100) ────────────────────────────────────────────
// Academic Risk monotonicity constraint: Risk ↑ = Priority ↑
// High uses shoulderR to ensure max(arHigh, arCritical) never decreases as risk increases.
export function arLow(v: number): number      { return shoulderL(v, 15, 40); }
export function arMedium(v: number): number   { return trap(v, 30, 42, 60, 74); }
export function arHigh(v: number): number     { return shoulderR(v, 60, 90); }
export function arCritical(v: number): number { return shoulderR(v, 82, 100); }

// ── Output MFs: PriorityScore (0–100) ────────────────────────────────────────
// Output MFs define the centroid for each priority level.
export function outLow(x: number): number {
  return shoulderL(x, OUTPUT_MF.LOW.a, OUTPUT_MF.LOW.b);
}

export function outMedium(x: number): number {
  return trap(x, OUTPUT_MF.MEDIUM.a, OUTPUT_MF.MEDIUM.b, OUTPUT_MF.MEDIUM.c, OUTPUT_MF.MEDIUM.d);
}

export function outHigh(x: number): number {
  return trap(x, OUTPUT_MF.HIGH.a, OUTPUT_MF.HIGH.b, OUTPUT_MF.HIGH.c, OUTPUT_MF.HIGH.d);
}

export function outCritical(x: number): number {
  return trap(x, OUTPUT_MF.CRITICAL.a, OUTPUT_MF.CRITICAL.b, OUTPUT_MF.CRITICAL.c, OUTPUT_MF.CRITICAL.d);
}
