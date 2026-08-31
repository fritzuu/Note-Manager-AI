/**
 * validate_monotonicity.mjs — Automated Mamdani Fuzzy Priority Engine Validator
 *
 * Tests:
 *  1. EXPECTED SCENARIOS — spot-check known human judgements
 *  2. DEADLINE MONOTONICITY — shorter deadline → higher or equal score
 *  3. IMPORTANCE MONOTONICITY — higher importance → higher or equal score
 *  4. PROGRESS MONOTONICITY — lower progress → higher or equal score
 *  5. DIFFICULTY MONOTONICITY — harder difficulty → higher or equal score
 *  6. ACADEMIC RISK MONOTONICITY — higher risk → higher or equal score
 *  7. EDGE CASES — boundary conditions and extreme values
 */

import { computePriority, computePriorityDetailed } from "../web/src/lib/fuzzyLogic.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────

const PASS = "\x1b[32m✓\x1b[0m";
const FAIL = "\x1b[31m✗\x1b[0m";
const INFO = "\x1b[36mℹ\x1b[0m";

let passed = 0, failed = 0;

function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  ${PASS} ${label}`);
    passed++;
  } else {
    console.log(`  ${FAIL} ${label}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

function r(inputs) {
  return computePriority(inputs);
}

function score(inputs) {
  return r(inputs).priorityScore;
}

function level(inputs) {
  return r(inputs).priorityLevel;
}

// ── SECTION 1: Expected Scenarios ────────────────────────────────────────────
console.log("\n\x1b[1m── SECTION 1: Expected Scenario Validation ──────────────────────────────\x1b[0m");

const scenarios = [
  { inputs: { deadlineDays: 2,  importance: 9,  difficulty: 5,  progress: 0,  academicRisk: 50 }, expectedLevel: "Critical", desc: "dl=2, imp=9 → Critical" },
  { inputs: { deadlineDays: 1,  importance: 9,  difficulty: 8,  progress: 10, academicRisk: 85 }, expectedLevel: "Critical", desc: "dl=1, imp=9, dif=8, ar=85 → Critical" },
  { inputs: { deadlineDays: 0,  importance: 7,  difficulty: 6,  progress: 20, academicRisk: 50 }, expectedLevel: "Critical", desc: "dl=0 (due today) → Critical" },
  { inputs: { deadlineDays: 7,  importance: 9,  difficulty: 8,  progress: 0,  academicRisk: 50 }, expectedLevel: "High",     desc: "dl=7, imp=9, dif=8 → High" },
  { inputs: { deadlineDays: 10, importance: 9,  difficulty: 8,  progress: 0,  academicRisk: 50 }, expectedLevel: "High",     desc: "dl=10, imp=9, dif=8 → High" },
  { inputs: { deadlineDays: 10, importance: 7,  difficulty: 5,  progress: 30, academicRisk: 30 }, expectedLevel: "Medium",   desc: "dl=10, imp=7, balanced → Medium" },
  { inputs: { deadlineDays: 20, importance: 3,  difficulty: 5,  progress: 60, academicRisk: 20 }, expectedLevel: "Low",      desc: "dl=20, imp=3, pro=60 → Low" },
  { inputs: { deadlineDays: 30, importance: 1,  difficulty: 1,  progress: 80, academicRisk: 5  }, expectedLevel: "Low",      desc: "far, easy, low importance → Low" },
  // Difficulty alone should NOT make Critical
  { inputs: { deadlineDays: 10, importance: 5,  difficulty: 10, progress: 0,  academicRisk: 40 }, notLevel: "Critical",      desc: "dif=10 alone should not be Critical" },
  // High academic risk + high importance can be Critical even with medium deadline
  { inputs: { deadlineDays: 5,  importance: 9,  difficulty: 8,  progress: 5,  academicRisk: 90 }, expectedLevel: "Critical", desc: "ar=90, imp=9, dl=5 → Critical" },
];

for (const s of scenarios) {
  const res = r(s.inputs);
  if (s.expectedLevel) {
    check(`${s.desc} [got ${res.priorityLevel}, score=${res.priorityScore}]`, res.priorityLevel === s.expectedLevel, `expected ${s.expectedLevel}`);
  } else if (s.notLevel) {
    check(`${s.desc} [got ${res.priorityLevel}, score=${res.priorityScore}]`, res.priorityLevel !== s.notLevel, `should not be ${s.notLevel}`);
  }
}

// ── SECTION 2: Deadline Monotonicity ─────────────────────────────────────────
console.log("\n\x1b[1m── SECTION 2: Deadline Monotonicity (shorter = higher priority) ─────────\x1b[0m");

const deadlineSeries = [0.5, 1, 2, 3, 5, 7, 10, 14, 20, 30];
const baseDeadlineInputs = { importance: 7, difficulty: 6, progress: 30, academicRisk: 50 };

let prevScore = null;
let prevDl = null;
let violations = 0;
for (const dl of deadlineSeries) {
  const s = score({ deadlineDays: dl, ...baseDeadlineInputs });
  if (prevScore !== null && s > prevScore + 2) {
    console.log(`  ${FAIL} dl=${prevDl}d→${dl}d: score went ${prevScore}→${s} (UP = violation!)`);
    violations++;
    failed++;
  }
  console.log(`  ${INFO} dl=${dl}d: score=${s}, level=${level({ deadlineDays: dl, ...baseDeadlineInputs })}`);
  prevScore = s;
  prevDl = dl;
}
if (violations === 0) {
  check("Deadline monotonicity: all steps non-increasing ✓", true);
  passed++;
} else {
  console.log(`  ${FAIL} Deadline monotonicity: ${violations} violation(s) detected`);
}

// ── SECTION 3: Importance Monotonicity ───────────────────────────────────────
console.log("\n\x1b[1m── SECTION 3: Importance Monotonicity (higher = higher priority) ─────────\x1b[0m");

const importanceSeries = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const baseImpInputs = { deadlineDays: 7, difficulty: 6, progress: 30, academicRisk: 50 };

let prevImpScore = null;
let prevImp = null;
let impViolations = 0;
for (const imp of importanceSeries) {
  const s = score({ ...baseImpInputs, importance: imp });
  if (prevImpScore !== null && s < prevImpScore - 2) {
    console.log(`  ${FAIL} imp=${prevImp}→${imp}: score went ${prevImpScore}→${s} (DOWN = violation!)`);
    impViolations++;
    failed++;
  }
  console.log(`  ${INFO} imp=${imp}: score=${s}`);
  prevImpScore = s;
  prevImp = imp;
}
if (impViolations === 0) {
  check("Importance monotonicity: all steps non-decreasing ✓", true);
  passed++;
}

// ── SECTION 4: Progress Monotonicity ─────────────────────────────────────────
console.log("\n\x1b[1m── SECTION 4: Progress Monotonicity (lower = higher priority) ──────────\x1b[0m");

const progressSeries = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const baseProInputs = { deadlineDays: 5, importance: 8, difficulty: 7, academicRisk: 60 };

let prevProScore = null;
let prevPro = null;
let proViolations = 0;
for (const pro of progressSeries) {
  const s = score({ ...baseProInputs, progress: pro });
  if (prevProScore !== null && s > prevProScore + 3) {
    console.log(`  ${FAIL} pro=${prevPro}%→${pro}%: score went ${prevProScore}→${s} (UP = violation!)`);
    proViolations++;
    failed++;
  }
  console.log(`  ${INFO} pro=${pro}%: score=${s}`);
  prevProScore = s;
  prevPro = pro;
}
if (proViolations === 0) {
  check("Progress monotonicity: all steps non-increasing ✓", true);
  passed++;
}

// ── SECTION 5: Difficulty Monotonicity ───────────────────────────────────────
console.log("\n\x1b[1m── SECTION 5: Difficulty Monotonicity (harder = higher priority) ────────\x1b[0m");

const difficultySeries = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const baseDifInputs = { deadlineDays: 7, importance: 7, progress: 30, academicRisk: 50 };

let prevDifScore = null;
let prevDif = null;
let difViolations = 0;
for (const dif of difficultySeries) {
  const s = score({ ...baseDifInputs, difficulty: dif });
  if (prevDifScore !== null && s < prevDifScore - 3) {
    console.log(`  ${FAIL} dif=${prevDif}→${dif}: score went ${prevDifScore}→${s} (DOWN = violation!)`);
    difViolations++;
    failed++;
  }
  console.log(`  ${INFO} dif=${dif}: score=${s}`);
  prevDifScore = s;
  prevDif = dif;
}
if (difViolations === 0) {
  check("Difficulty monotonicity: all steps non-decreasing ✓", true);
  passed++;
}

// ── SECTION 6: Academic Risk Monotonicity ────────────────────────────────────
console.log("\n\x1b[1m── SECTION 6: Academic Risk Monotonicity (higher = higher priority) ─────\x1b[0m");

const riskSeries = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const baseArInputs = { deadlineDays: 7, importance: 7, difficulty: 6, progress: 30 };

let prevArScore = null;
let prevAr = null;
let arViolations = 0;
for (const ar of riskSeries) {
  const s = score({ ...baseArInputs, academicRisk: ar });
  if (prevArScore !== null && s < prevArScore - 2) {
    console.log(`  ${FAIL} ar=${prevAr}→${ar}: score went ${prevArScore}→${s} (DOWN = violation!)`);
    arViolations++;
    failed++;
  }
  console.log(`  ${INFO} ar=${ar}: score=${s}`);
  prevArScore = s;
  prevAr = ar;
}
if (arViolations === 0) {
  check("Academic Risk monotonicity: all steps non-decreasing ✓", true);
  passed++;
}

// ── SECTION 7: Edge Cases ────────────────────────────────────────────────────
console.log("\n\x1b[1m── SECTION 7: Edge Cases ────────────────────────────────────────────────\x1b[0m");

const completed = r({ deadlineDays: 1, importance: 10, difficulty: 10, progress: 100, academicRisk: 100 });
check("progress=100 always returns Low (task complete)", completed.priorityLevel === "Low" && completed.priorityScore === 0, `got ${completed.priorityLevel}`);

const overdue = r({ deadlineDays: -5, importance: 7, difficulty: 5, progress: 20, academicRisk: 50 });
check("overdue task gets elevated score", overdue.priorityScore >= 70, `score=${overdue.priorityScore}`);

const worstCase = r({ deadlineDays: 0, importance: 10, difficulty: 10, progress: 0, academicRisk: 100 });
check("worst case: score >= 90", worstCase.priorityScore >= 90, `score=${worstCase.priorityScore}`);
check("worst case: level = Critical", worstCase.priorityLevel === "Critical", `level=${worstCase.priorityLevel}`);

const bestCase = r({ deadlineDays: 30, importance: 1, difficulty: 1, progress: 90, academicRisk: 0 });
check("best case: score <= 20", bestCase.priorityScore <= 20, `score=${bestCase.priorityScore}`);
check("best case: level = Low", bestCase.priorityLevel === "Low", `level=${bestCase.priorityLevel}`);

// Detail check — ensure activatedRules > 0
const detailed = computePriorityDetailed({ deadlineDays: 5, importance: 8, difficulty: 7, progress: 20, academicRisk: 70 });
check("computePriorityDetailed returns activatedRules", detailed.activatedRules.length > 0, `got ${detailed.activatedRules.length} rules`);
check("computePriorityDetailed returns memberships", typeof detailed.memberships === "object");
check("all rule strengths in [0,1]", detailed.activatedRules.every(r => r.strength >= 0 && r.strength <= 1), "out of range found");

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n\x1b[1m── SUMMARY ──────────────────────────────────────────────────────────────\x1b[0m`);
console.log(`  Passed: \x1b[32m${passed}\x1b[0m  |  Failed: \x1b[31m${failed}\x1b[0m`);

if (failed === 0) {
  console.log(`  \x1b[32m\x1b[1m✓ ALL TESTS PASSED — Engine is monotonic and correct\x1b[0m`);
} else {
  console.log(`  \x1b[31m\x1b[1m✗ ${failed} test(s) failed — Review rule base\x1b[0m`);
  process.exit(1);
}
