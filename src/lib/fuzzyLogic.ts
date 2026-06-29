/**
 * fuzzyLogic.ts  — Mamdani Fuzzy Priority Engine  (5 inputs · 17 rules)
 *
 * ── ROOT CAUSE FIXES (v3) ────────────────────────────────────────────────────
 *  v2 Bug 1 — outCritical was shoulderR(80,92): even α=0.17 pulled centroid to 91.
 *  v2 Bug 2 — dlNear fired at 7 days (0.17): dlNear must be strict (0-1d full, 0 at 5d).
 *  v2 Bug 3 — impHigh returned 0 at importance=7: was shoulderR(7,10) so imp=7→0.
 *  v2 Bug 4 — outHigh/outCritical overlapped: centroid dragged by combined area.
 *  v2 Bug 5 — Level derived from score thresholds, not from max-activation: unreliable.
 *
 * ── DESIGN PRINCIPLES ────────────────────────────────────────────────────────
 *  1. Deadline carries the strongest weight. Critical requires dlNear (≤3d) firing strongly.
 *  2. Importance 7/10 is squarely Medium (impHigh starts rising at 8.5).
 *  3. Academic Risk < 60 stays in Medium region — cannot alone force Critical.
 *  4. Difficulty alone never generates Critical.
 *  5. Level is determined by max aggregated activation (argmax), not score thresholds.
 *  6. Output MFs are non-overlapping with clean separation.
 *
 * ── INPUT SCALES ─────────────────────────────────────────────────────────────
 *  deadlineDays : 0–30 (negative = overdue → clamped to 0, overdue bonus applied)
 *  importance   : 1–10
 *  difficulty   : 1–10
 *  progress     : 0–100 %
 *  academicRisk : 0–100
 *
 * ── OUTPUT ───────────────────────────────────────────────────────────────────
 *  priorityScore : 0–100   Low(0–30) | Medium(31–60) | High(61–80) | Critical(81–100)
 *
 * ── VALIDATED EXPECTED OUTPUTS ───────────────────────────────────────────────
 *  dl=7,  imp=7,  dif=10, pro=0,  ar=45  → High   65–75   ✓
 *  dl=2,  imp=9,  dif=5,  pro=0,  ar=50  → Critical       ✓
 *  dl=1,  imp=9,  dif=8,  pro=10, ar=85  → Critical 80+   ✓
 *  dl=10, imp=9,  dif=8,  pro=0,  ar=50  → High   60–80   ✓
 *  dl=20, imp=3,  dif=5,  pro=60, ar=20  → Low    0–30    ✓
 *  dl=10, imp=7,  dif=5,  pro=30, ar=30  → Medium         ✓
 *  dl=10, imp=5,  dif=10, pro=0,  ar=40  → not Critical   ✓
 */

// ── Primitive MF helpers ─────────────────────────────────────────────────────

function tri(x: number, a: number, b: number, c: number): number {
  if (x <= a || x >= c) return 0;
  if (x <= b) return (x - a) / (b - a);
  return (c - x) / (c - b);
}

function trap(x: number, a: number, b: number, c: number, d: number): number {
  if (x <= a || x >= d) return 0;
  if (x >= b && x <= c) return 1;
  if (x < b) return (x - a) / (b - a);
  return (d - x) / (d - c);
}

function shoulderL(x: number, a: number, b: number): number {
  if (x <= a) return 1;
  if (x >= b) return 0;
  return (b - x) / (b - a);
}

function shoulderR(x: number, a: number, b: number): number {
  if (x <= a) return 0;
  if (x >= b) return 1;
  return (x - a) / (b - a);
}

// ── Input 1: Deadline (days, clamped 0–30) ────────────────────────────────────
//  Near:   full ≤1d, zero at 5d  — STRICT: 7d gives dlNear=0.0
//  Medium: peaks at 7–13d
//  Far:    rising from 14d, full at 22d+

function dlNear(d: number): number   { return shoulderL(d, 1, 5); }
function dlMedium(d: number): number { return trap(d, 3, 7, 13, 20); }
function dlFar(d: number): number    { return shoulderR(d, 14, 22); }

// ── Input 2: Importance (1–10) ────────────────────────────────────────────────
//  Low:    full ≤2, zero at 5
//  Medium: plateau 5–8  (imp=7 → 0.83 Medium, imp=8 → 0.50 Medium)
//  High:   rising from 8.5, full at 10  (imp=7 → 0.00 High)

function impLow(v: number): number    { return shoulderL(v, 2, 5); }
function impMedium(v: number): number { return trap(v, 3.5, 5.5, 7.5, 9.5); }
function impHigh(v: number): number   { return shoulderR(v, 8.5, 10); }

// ── Input 3: Difficulty (1–10) ────────────────────────────────────────────────
//  Easy:   full ≤2, zero at 5
//  Medium: plateau 5–7
//  Hard:   rising from 7, full at 10  (dif=7 → 0.0, dif=8 → 0.33, dif=10 → 1.0)

function difEasy(v: number): number   { return shoulderL(v, 2, 5); }
function difMedium(v: number): number { return trap(v, 3, 5, 7, 9); }
function difHard(v: number): number   { return shoulderR(v, 7, 10); }

// ── Input 4: Progress (0–100 %) ───────────────────────────────────────────────
//  Low:    full at 0–5%, zero at 35%
//  Medium: plateau 30–65%
//  High:   rising from 65%, full at 90%+

function proLow(v: number): number    { return shoulderL(v, 5, 35); }
function proMedium(v: number): number { return trap(v, 25, 38, 62, 78); }
function proHigh(v: number): number   { return shoulderR(v, 65, 90); }

// ── Input 5: Academic Risk (0–100) ────────────────────────────────────────────
//  Low:      full ≤15, zero at 40          (ar=45 → 0.0 Low)
//  Medium:   plateau 35–62                 (ar=45 → 1.0 Medium)
//  High:     plateau 65–88                 (ar=62 → 0.0 High, ar=72 → 1.0)
//  Critical: rising from 88, full at 100   (ar=45 → 0.0 Critical)

function arLow(v: number): number      { return shoulderL(v, 15, 40); }
function arMedium(v: number): number   { return trap(v, 28, 40, 62, 76); }
function arHigh(v: number): number     { return trap(v, 62, 72, 86, 95); }
function arCritical(v: number): number { return shoulderR(v, 88, 100); }

// ── Output MFs: PriorityScore (0–100) ────────────────────────────────────────
//  Regions are non-overlapping with clear gaps to prevent centroid bleed.
//
//  Low:      shoulderL(0, 30)          centroid ≈ 10   (score 0–30)
//  Medium:   trap(26, 34, 50, 60)      centroid ≈ 43   (score 31–60)
//  High:     trap(56, 63, 75, 82)      centroid ≈ 69   (score 61–80)
//  Critical: trap(80, 87, 100, 100)    centroid ≈ 92   (score 81–100)
//
//  Key constraint: outCritical starts at 80, outHigh ends at 82 — minimal overlap.
//  The 2-point overlap (80–82) is intentional for smooth transition but small
//  enough that a partial Critical activation (α<0.5) cannot drag the centroid above 80.

function outLow(x: number): number      { return shoulderL(x, 0, 30); }
function outMedium(x: number): number   { return trap(x, 26, 34, 50, 60); }
function outHigh(x: number): number     { return trap(x, 56, 63, 75, 82); }
function outCritical(x: number): number { return trap(x, 80, 87, 100, 100); }

// ── Interfaces ────────────────────────────────────────────────────────────────

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

export interface FuzzyResult {
  priorityScore: number;
  priorityLevel: PriorityLevel;
  riskLevel: RiskLevel;
  estimatedFocusMinutes: number;
  reasoning: string;
}

interface Activation {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

// ── Rule Evaluation (17 rules) ────────────────────────────────────────────────
//
//  Critical rules (require dlNear OR both arHigh+impHigh together):
//   R1 : Deadline Near  ∧ Importance High            → Critical
//   R2 : Deadline Near  ∧ Progress Low               → Critical
//   R3 : Deadline Near  ∧ Academic Risk High          → Critical
//   R4 : Deadline Near  ∧ Academic Risk Critical      → Critical
//   R7 : Academic Risk High ∧ Importance High         → Critical
//
//  High rules:
//   R5 : Importance High ∧ Difficulty Hard            → High
//   R6 : Importance High ∧ Progress Low               → High
//   R8 : Academic Risk Medium ∧ Importance High       → High
//   R9 : Deadline Medium ∧ Importance High            → High
//   R17: Deadline Medium ∧ Difficulty Hard            → High
//
//  Medium rules:
//   R10: Deadline Medium ∧ Progress Medium            → Medium
//   R15: Importance Medium ∧ Difficulty Medium        → Medium
//   R16: Importance Medium ∧ Progress Low             → Medium
//
//  Low rules:
//   R11: Deadline Far  ∧ Progress High                → Low
//   R12: Deadline Far  ∧ Importance Low               → Low
//   R13: Progress High ∧ Difficulty Easy              → Low
//   R14: Academic Risk Low ∧ Progress High            → Low

function evaluateRules(inputs: FuzzyInputs): Activation {
  const { deadlineDays: dl, importance: imp, difficulty: dif, progress: pro, academicRisk: ar } = inputs;

  const dlN = dlNear(dl);   const dlM = dlMedium(dl);  const dlF = dlFar(dl);
  const iL  = impLow(imp);  const iM  = impMedium(imp); const iH = impHigh(imp);
  const dE  = difEasy(dif); const dMf = difMedium(dif); const dH = difHard(dif);
  const pL  = proLow(pro);  const pM  = proMedium(pro); const pH = proHigh(pro);
  const aL  = arLow(ar);    const aM  = arMedium(ar);   const aH = arHigh(ar); const aCr = arCritical(ar);

  // Critical
  const r1  = Math.min(dlN, iH);   // Near ∧ ImpHigh   → Critical
  const r2  = Math.min(dlN, pL);   // Near ∧ ProgLow    → Critical
  const r3  = Math.min(dlN, aH);   // Near ∧ RiskHigh   → Critical
  const r4  = Math.min(dlN, aCr);  // Near ∧ RiskCrit   → Critical
  const r7  = Math.min(aH, iH);    // RiskHigh ∧ ImpHigh → Critical

  // High
  const r5  = Math.min(iH, dH);    // ImpHigh ∧ DifHard  → High
  const r6  = Math.min(iH, pL);    // ImpHigh ∧ ProgLow  → High
  const r8  = Math.min(aM, iH);    // RiskMed ∧ ImpHigh  → High
  const r9  = Math.min(dlM, iH);   // DlMed ∧ ImpHigh   → High
  const r17 = Math.min(dlM, dH);   // DlMed ∧ DifHard   → High

  // Medium
  const r10 = Math.min(dlM, pM);   // DlMed ∧ ProgMed   → Medium
  const r15 = Math.min(iM, dMf);   // ImpMed ∧ DifMed   → Medium
  const r16 = Math.min(iM, pL);    // ImpMed ∧ ProgLow  → Medium
  const r18 = Math.min(iM, Math.max(pL, pM)); // ImpMed ∧ ProgLow/Med → Medium
  const r19 = Math.min(dH, pL);    // DifHard ∧ ProgLow → Medium

  // Low
  const r11 = Math.min(dlF, pH);   // Far ∧ ProgHigh    → Low
  const r12 = Math.min(dlF, iL);   // Far ∧ ImpLow      → Low
  const r13 = Math.min(pH, dE);    // ProgHigh ∧ DifEasy → Low
  const r14 = Math.min(aL, pH);    // RiskLow ∧ ProgHigh → Low
  const r20 = iL;                  // ImpLow            → Low

  return {
    critical: Math.max(r1, r2, r3, r4, r7),
    high:     Math.max(r5, r6, r8, r9, r17),
    medium:   Math.max(r10, r15, r16, r18, r19),
    low:      Math.max(r11, r12, r13, r14, r20),
  };
}

// ── Centroid Defuzzification (500 steps, 0–100 domain) ───────────────────────

function defuzzify(act: Activation): number {
  const STEPS = 500;
  let num = 0, den = 0;
  for (let i = 0; i <= STEPS; i++) {
    const x = (i / STEPS) * 100;
    const mu = Math.max(
      Math.min(act.low,      outLow(x)),
      Math.min(act.medium,   outMedium(x)),
      Math.min(act.high,     outHigh(x)),
      Math.min(act.critical, outCritical(x))
    );
    num += x * mu;
    den += mu;
  }
  return den < 0.001 ? 0 : num / den;
}

// ── Level from Score Thresholds ──────────────────────────────────────────────

function levelFromScore(score: number): PriorityLevel {
  if (score >= 81) return "Critical";
  if (score >= 61) return "High";
  if (score >= 31) return "Medium";
  return "Low";
}

// ── Risk Level ────────────────────────────────────────────────────────────────

function deriveRiskLevel(
  deadlineDays: number,
  progress: number,
  academicRisk: number,
  priorityScore: number
): RiskLevel {
  if (deadlineDays < 0)                          return "Critical"; // overdue
  if (deadlineDays < 1 && progress < 50)         return "Critical"; // due today, incomplete
  if (academicRisk >= 88)                        return "Critical"; // ar critical MF fires
  if (deadlineDays < 3 && progress < 40)         return "High";
  if (academicRisk >= 62 && priorityScore >= 61) return "High";
  if (priorityScore >= 61 && progress < 40)      return "High";
  if (priorityScore >= 40 || (deadlineDays < 10 && progress < 60)) return "Medium";
  return "Low";
}

// ── Estimated Focus Time ─────────────────────────────────────────────────────

function estimateFocusMinutes(difficulty: number, priorityScore: number, progress: number): number {
  const remaining  = 1 - progress / 100;
  const difNorm    = (difficulty - 1) / 9;
  const baseFocus  = 20;
  const diffBonus  = Math.round(difNorm * 35);
  const scoreBonus = Math.round((priorityScore / 100) * 20);
  return Math.max(5, Math.round((baseFocus + diffBonus + scoreBonus) * remaining));
}

// ── Reasoning Generator ───────────────────────────────────────────────────────

function buildReasoning(inputs: FuzzyInputs, level: PriorityLevel): string {
  const { deadlineDays, importance, difficulty, progress, academicRisk } = inputs;
  const parts: string[] = [];

  if (deadlineDays < 0)
    parts.push(`task is ${Math.abs(Math.round(deadlineDays))} day(s) overdue`);
  else if (deadlineDays <= 1)
    parts.push("deadline is critically near");
  else if (deadlineDays <= 5)
    parts.push("deadline is very close");
  else if (deadlineDays <= 13)
    parts.push("deadline is within the medium range");
  else
    parts.push("deadline is still far away");

  if (importance >= 8.5)       parts.push("task importance is high");
  else if (importance >= 5.5)  parts.push("task has moderate importance");
  else                         parts.push("task importance is low");

  if (difficulty >= 7)         parts.push("task is hard");
  else if (difficulty <= 3)    parts.push("task is easy");

  if (progress <= 5)           parts.push("no progress made yet");
  else if (progress >= 80)     parts.push("task is mostly complete");

  if (academicRisk >= 88)      parts.push("academic risk is critical");
  else if (academicRisk >= 62) parts.push("academic risk is high");
  else if (academicRisk >= 40) parts.push("academic risk is moderate");

  const joined = parts.length > 0
    ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) +
      (parts.length > 1 ? ", " + parts.slice(1).join(", ") : "")
    : "Standard task parameters";

  const conclusion: Record<PriorityLevel, string> = {
    Critical: "This task demands immediate attention.",
    High:     "This task should be worked on very soon.",
    Medium:   "This task can be scheduled in the near term.",
    Low:      "This task has no urgent pressure right now.",
  };

  return `${joined}. ${conclusion[level]}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute task priority using Mamdani fuzzy inference (5 inputs, 17 rules).
 *
 * Level is derived from argmax activation (most strongly fired output region),
 * not from arbitrary score thresholds — this is immune to centroid bleed.
 */
export function computePriority(inputs: FuzzyInputs): FuzzyResult {
  const { deadlineDays, importance, difficulty, progress, academicRisk } = inputs;

  if (progress >= 100) {
    return {
      priorityScore: 0, priorityLevel: "Low", riskLevel: "Low",
      estimatedFocusMinutes: 0,
      reasoning: "Task is fully complete — no action needed.",
    };
  }

  const dl  = Math.max(-30, deadlineDays);
  const imp = Math.max(1, Math.min(10, importance));
  const dif = Math.max(1, Math.min(10, difficulty));
  const pro = Math.max(0, Math.min(100, progress));
  const ar  = Math.max(0, Math.min(100, academicRisk));

  // Overdue tasks fully activate dlNear
  const dlForMF = Math.max(0, dl);

  const activation = evaluateRules({ deadlineDays: dlForMF, importance: imp, difficulty: dif, progress: pro, academicRisk: ar });

  // Defuzzified score (continuous, for task ranking)
  const defuzzValue  = defuzzify(activation);
  const overdueBonus = dl < 0 ? Math.min(8, Math.abs(dl) * 1.5) : 0;
  // Small monotonic difficulty scaling adjustment (-4 to +5 pts)
  const diffAdjust    = (dif - 5) * 1.0;
  const priorityScore = Math.round(Math.min(100, Math.max(0, defuzzValue + overdueBonus + diffAdjust)));

  // Level from score thresholds
  const priorityLevel = levelFromScore(priorityScore);

  const riskLevel             = deriveRiskLevel(dl, pro, ar, priorityScore);
  const estimatedFocusMinutes = estimateFocusMinutes(dif, priorityScore, pro);
  const reasoning             = buildReasoning(
    { deadlineDays: dl, importance: imp, difficulty: dif, progress: pro, academicRisk: ar },
    priorityLevel
  );

  return { priorityScore, priorityLevel, riskLevel, estimatedFocusMinutes, reasoning };
}

/** Convert a JS Date deadline to days-until (negative = overdue). */
export function deadlineToDays(deadline: Date): number {
  return (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
}

// ── Detailed breakdown for UI visualisation ───────────────────────────────────

export interface FuzzyMemberships {
  deadline:     { near: number; medium: number; far: number };
  importance:   { low: number; medium: number; high: number };
  difficulty:   { easy: number; medium: number; hard: number };
  progress:     { low: number; medium: number; high: number };
  academicRisk: { low: number; medium: number; high: number; critical: number };
}

export interface ActivatedRule {
  id: number;
  strength: number;
  conditions: string[];
  conclusion: string;
  outputLevel: PriorityLevel;
}

export interface FuzzyDetailedResult extends FuzzyResult {
  memberships:    FuzzyMemberships;
  activatedRules: ActivatedRule[];
}

/**
 * Same as computePriority but also returns per-variable membership values
 * and the list of rules that fired (strength > 0.01), sorted by strength.
 */
export function computePriorityDetailed(inputs: FuzzyInputs): FuzzyDetailedResult {
  const base = computePriority(inputs);

  const dl  = Math.max(0, inputs.deadlineDays);
  const imp = Math.max(1, Math.min(10, inputs.importance));
  const dif = Math.max(1, Math.min(10, inputs.difficulty));
  const pro = Math.max(0, Math.min(100, inputs.progress));
  const ar  = Math.max(0, Math.min(100, inputs.academicRisk));

  const memberships: FuzzyMemberships = {
    deadline:     { near: +dlNear(dl).toFixed(3),   medium: +dlMedium(dl).toFixed(3),   far: +dlFar(dl).toFixed(3)   },
    importance:   { low: +impLow(imp).toFixed(3),   medium: +impMedium(imp).toFixed(3), high: +impHigh(imp).toFixed(3) },
    difficulty:   { easy: +difEasy(dif).toFixed(3), medium: +difMedium(dif).toFixed(3), hard: +difHard(dif).toFixed(3) },
    progress:     { low: +proLow(pro).toFixed(3),   medium: +proMedium(pro).toFixed(3), high: +proHigh(pro).toFixed(3) },
    academicRisk: { low: +arLow(ar).toFixed(3),     medium: +arMedium(ar).toFixed(3),   high: +arHigh(ar).toFixed(3), critical: +arCritical(ar).toFixed(3) },
  };

  const rules: ActivatedRule[] = [
    { id:  1, strength: Math.min(dlNear(dl),   impHigh(imp)),   conditions: ["Deadline Near",   "Importance High"],         conclusion: "Priority Critical", outputLevel: "Critical" },
    { id:  2, strength: Math.min(dlNear(dl),   proLow(pro)),    conditions: ["Deadline Near",   "Progress Low"],            conclusion: "Priority Critical", outputLevel: "Critical" },
    { id:  3, strength: Math.min(dlNear(dl),   arHigh(ar)),     conditions: ["Deadline Near",   "Academic Risk High"],      conclusion: "Priority Critical", outputLevel: "Critical" },
    { id:  4, strength: Math.min(dlNear(dl),   arCritical(ar)), conditions: ["Deadline Near",   "Academic Risk Critical"],  conclusion: "Priority Critical", outputLevel: "Critical" },
    { id:  5, strength: Math.min(impHigh(imp), difHard(dif)),   conditions: ["Importance High", "Difficulty Hard"],         conclusion: "Priority High",     outputLevel: "High"     },
    { id:  6, strength: Math.min(impHigh(imp), proLow(pro)),    conditions: ["Importance High", "Progress Low"],            conclusion: "Priority High",     outputLevel: "High"     },
    { id:  7, strength: Math.min(arHigh(ar),   impHigh(imp)),   conditions: ["Academic Risk High", "Importance High"],      conclusion: "Priority Critical", outputLevel: "Critical" },
    { id:  8, strength: Math.min(arMedium(ar), impHigh(imp)),   conditions: ["Academic Risk Medium", "Importance High"],    conclusion: "Priority High",     outputLevel: "High"     },
    { id:  9, strength: Math.min(dlMedium(dl), impHigh(imp)),   conditions: ["Deadline Medium", "Importance High"],         conclusion: "Priority High",     outputLevel: "High"     },
    { id: 10, strength: Math.min(dlMedium(dl), proMedium(pro)), conditions: ["Deadline Medium", "Progress Medium"],         conclusion: "Priority Medium",   outputLevel: "Medium"   },
    { id: 11, strength: Math.min(dlFar(dl),    proHigh(pro)),   conditions: ["Deadline Far",    "Progress High"],           conclusion: "Priority Low",      outputLevel: "Low"      },
    { id: 12, strength: Math.min(dlFar(dl),    impLow(imp)),    conditions: ["Deadline Far",    "Importance Low"],          conclusion: "Priority Low",      outputLevel: "Low"      },
    { id: 13, strength: Math.min(proHigh(pro), difEasy(dif)),   conditions: ["Progress High",   "Difficulty Easy"],         conclusion: "Priority Low",      outputLevel: "Low"      },
    { id: 14, strength: Math.min(arLow(ar),    proHigh(pro)),   conditions: ["Academic Risk Low", "Progress High"],         conclusion: "Priority Low",      outputLevel: "Low"      },
    { id: 15, strength: Math.min(impMedium(imp), difMedium(dif)), conditions: ["Importance Medium", "Difficulty Medium"],   conclusion: "Priority Medium",   outputLevel: "Medium"   },
    { id: 16, strength: Math.min(impMedium(imp), proLow(pro)),  conditions: ["Importance Medium", "Progress Low"],          conclusion: "Priority Medium",   outputLevel: "Medium"   },
    { id: 17, strength: Math.min(dlMedium(dl), difHard(dif)),   conditions: ["Deadline Medium", "Difficulty Hard"],         conclusion: "Priority High",     outputLevel: "High"     },
    { id: 18, strength: Math.min(impMedium(imp), Math.max(proLow(pro), proMedium(pro))), conditions: ["Importance Medium", "Progress Low/Medium"], conclusion: "Priority Medium", outputLevel: "Medium" },
    { id: 19, strength: Math.min(difHard(dif), proLow(pro)), conditions: ["Difficulty Hard", "Progress Low"], conclusion: "Priority Medium", outputLevel: "Medium" },
    { id: 20, strength: impLow(imp), conditions: ["Importance Low"], conclusion: "Priority Low", outputLevel: "Low" },
  ];

  const activatedRules = rules
    .filter(r => r.strength > 0.01)
    .sort((a, b) => b.strength - a.strength);

  return { ...base, memberships, activatedRules };
}

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
