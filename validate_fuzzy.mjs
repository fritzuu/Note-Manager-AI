/**
 * validate_fuzzy.mjs
 * Run this script to validate the redesigned fuzzy logic system.
 * Usage: node validate_fuzzy.mjs
 */

// ── Membership Function Primitives ──────────────────────────────────────────

function tri(x, a, b, c) {
  if (x <= a || x >= c) return 0;
  if (x <= b) return (x - a) / (b - a);
  return (c - x) / (c - b);
}
function trap(x, a, b, c, d) {
  if (x <= a || x >= d) return 0;
  if (x >= b && x <= c) return 1;
  if (x < b) return (x - a) / (b - a);
  return (d - x) / (d - c);
}
function shoulderLeft(x, a, b) {
  if (x <= a) return 1;
  if (x >= b) return 0;
  return (b - x) / (b - a);
}
function shoulderRight(x, a, b) {
  if (x <= a) return 0;
  if (x >= b) return 1;
  return (x - a) / (b - a);
}

// ── Input MFs (0–100) ────────────────────────────────────────────────────────
const mfLow    = v => shoulderLeft(v, 0, 50);
const mfMedium = v => tri(v, 25, 50, 75);
const mfHigh   = v => shoulderRight(v, 50, 100);

// ── Output MFs ───────────────────────────────────────────────────────────────
const outputLow    = x => shoulderLeft(x, 0, 40);
const outputMedium = x => trap(x, 30, 40, 60, 70);
const outputHigh   = x => trap(x, 75, 90, 100, 100);

// ── Progress MF ───────────────────────────────────────────────────────────────
const progressNearComplete = v => shoulderRight(v, 60, 95);

// ── Rules ────────────────────────────────────────────────────────────────────
function evaluateRules(importance, difficulty) {
  const iL = mfLow(importance), iM = mfMedium(importance), iH = mfHigh(importance);
  const dE = mfLow(difficulty),  dM = mfMedium(difficulty),  dH = mfHigh(difficulty);

  let high   = Math.max(Math.min(iH,dE), Math.min(iH,dM), Math.min(iH,dH), iH); // R1+R2+R3+R10
  let medium = Math.max(Math.min(iM,dE), Math.min(iM,dM), Math.min(iM,dH));      // R4+R5+R6
  let low    = Math.max(Math.min(iL,dE), Math.min(iL,dM), Math.min(iL,dH), iL); // R7+R8+R9+R11

  return { low, medium, high };
}

// ── Defuzzification ───────────────────────────────────────────────────────────
function defuzzify(act) {
  const STEPS = 400;
  let num = 0, den = 0;
  for (let i = 0; i <= STEPS; i++) {
    const x = (i / STEPS) * 100;
    const mu = Math.max(
      Math.min(act.low,    outputLow(x)),
      Math.min(act.medium, outputMedium(x)),
      Math.min(act.high,   outputHigh(x))
    );
    num += x * mu;
    den += mu;
  }
  return den < 0.001 ? 0 : num / den;
}

function deadlineBonus(days) {
  if (days < 0)  return 12;
  if (days < 1)  return 10;
  if (days < 3)  return 7;
  if (days < 7)  return 4;
  if (days < 14) return 2;
  return 0;
}

function computeDebug(imp, dif, deadlineDays = 7, progress = 0) {
  const iL = mfLow(imp), iM = mfMedium(imp), iH = mfHigh(imp);
  const dE = mfLow(dif), dM = mfMedium(dif), dH = mfHigh(dif);

  const r1=Math.min(iH,dE), r2=Math.min(iH,dM), r3=Math.min(iH,dH);
  const r4=Math.min(iM,dE), r5=Math.min(iM,dM), r6=Math.min(iM,dH);
  const r7=Math.min(iL,dE), r8=Math.min(iL,dM), r9=Math.min(iL,dH);
  const r10=iH, r11=iL;

  const aggHigh   = Math.max(r1,r2,r3,r10);
  const aggMedium = Math.max(r4,r5,r6);
  const aggLow    = Math.max(r7,r8,r9,r11);

  const defuzzValue    = defuzzify({ low: aggLow, medium: aggMedium, high: aggHigh });
  const bonus          = deadlineBonus(deadlineDays);
  const progressDisc   = progressNearComplete(progress) * 5;
  const finalScore     = Math.round(Math.min(100, Math.max(0, defuzzValue + bonus - progressDisc)));

  let level;
  if (finalScore >= 80)      level = "Critical";
  else if (finalScore >= 60) level = "High";
  else if (finalScore >= 32) level = "Medium";
  else                       level = "Low";

  return { iL, iM, iH, dE, dM, dH, r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11,
    aggLow, aggMedium, aggHigh, defuzzValue, bonus, progressDisc, finalScore, level };
}

// ── Validation Cases ─────────────────────────────────────────────────────────
const cases = [
  { imp: 100, dif: 100, lo: 90, hi: 100, desc: "Importance=100, Difficulty=100" },
  { imp: 100, dif:   0, lo: 90, hi: 100, desc: "Importance=100, Difficulty=0" },
  { imp:  80, dif:  20, lo: 80, hi:  95, desc: "Importance=80,  Difficulty=20" },
  { imp:  50, dif:  50, lo: 45, hi:  60, desc: "Importance=50,  Difficulty=50" },
  { imp:  30, dif:  80, lo: 20, hi:  40, desc: "Importance=30,  Difficulty=80" },
  { imp:   0, dif: 100, lo:  0, hi:  20, desc: "Importance=0,   Difficulty=100" },
  { imp:   0, dif:   0, lo:  0, hi:  20, desc: "Importance=0,   Difficulty=0" },
];

const pad = (s, n) => String(s).padEnd(n);
const fmt = n => typeof n === 'number' ? n.toFixed(4) : n;

console.log("\n═══════════════════════════════════════════════════════════════════════════");
console.log("  FUZZY LOGIC VALIDATION — Redesigned Mamdani System");
console.log("  (deadlineDays = 7, progress = 0  →  deadline bonus = +4 pts)");
console.log("═══════════════════════════════════════════════════════════════════════════\n");

let allPass = true;

cases.forEach(({ imp, dif, lo, hi, desc }) => {
  const d = computeDebug(imp, dif, 7, 0);
  const pass = d.finalScore >= lo && d.finalScore <= hi;
  if (!pass) allPass = false;

  console.log(`${pass ? "✅" : "❌"}  ${desc}`);
  console.log(`   Expected: ${lo}–${hi}  |  Got: ${d.finalScore}  |  Level: ${d.level}`);
  console.log();
  console.log("   ── MEMBERSHIP DEGREES ──────────────────────────────────");
  console.log(`   Importance:  Low=${fmt(d.iL)}  Medium=${fmt(d.iM)}  High=${fmt(d.iH)}`);
  console.log(`   Difficulty:  Easy=${fmt(d.dE)}  Medium=${fmt(d.dM)}  Hard=${fmt(d.dH)}`);
  console.log();
  console.log("   ── RULE FIRING STRENGTHS ─────────────────────────────");
  console.log(`   R1  IH∧Easy  → HIGH   : ${fmt(d.r1)}`);
  console.log(`   R2  IH∧Med   → HIGH   : ${fmt(d.r2)}`);
  console.log(`   R3  IH∧Hard  → HIGH   : ${fmt(d.r3)}`);
  console.log(`   R4  IM∧Easy  → MEDIUM : ${fmt(d.r4)}`);
  console.log(`   R5  IM∧Med   → MEDIUM : ${fmt(d.r5)}`);
  console.log(`   R6  IM∧Hard  → MEDIUM : ${fmt(d.r6)}`);
  console.log(`   R7  IL∧Easy  → LOW    : ${fmt(d.r7)}`);
  console.log(`   R8  IL∧Med   → LOW    : ${fmt(d.r8)}`);
  console.log(`   R9  IL∧Hard  → LOW    : ${fmt(d.r9)}`);
  console.log(`   R10 IH (dominance) → HIGH : ${fmt(d.r10)}`);
  console.log(`   R11 IL (dominance) → LOW  : ${fmt(d.r11)}`);
  console.log();
  console.log("   ── AGGREGATED OUTPUT ─────────────────────────────────");
  console.log(`   aggLow    = ${fmt(d.aggLow)}`);
  console.log(`   aggMedium = ${fmt(d.aggMedium)}`);
  console.log(`   aggHigh   = ${fmt(d.aggHigh)}`);
  console.log();
  console.log("   ── DEFUZZIFICATION ───────────────────────────────────");
  console.log(`   Centroid (defuzz)  = ${d.defuzzValue.toFixed(4)}`);
  console.log(`   Deadline bonus     = +${d.bonus}`);
  console.log(`   Progress discount  = -${d.progressDisc.toFixed(4)}`);
  console.log(`   ─────────────────────────────────────────────────────`);
  console.log(`   Final Priority Score = ${d.finalScore}  →  "${d.level}"`);
  console.log("\n───────────────────────────────────────────────────────────────────────\n");
});

// Sensitivity test
console.log("═══════════════════════════════════════════════════════════════════════════");
console.log("  SENSITIVITY TEST — Score distribution (Difficulty fixed at 50)");
console.log("═══════════════════════════════════════════════════════════════════════════");
console.log(`  Importance  Score   Level`);
console.log(`  ─────────── ─────── ──────────`);
[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].forEach(imp => {
  const d = computeDebug(imp, 50, 7, 0);
  const bar = "█".repeat(Math.round(d.finalScore / 5));
  console.log(`  ${String(imp).padStart(3)}         ${String(d.finalScore).padStart(3)}     ${pad(d.level, 10)}  ${bar}`);
});

console.log("\n═══════════════════════════════════════════════════════════════════════════");
console.log(allPass ? "  ✅  ALL VALIDATION CASES PASSED!" : "  ❌  SOME CASES FAILED — review above.");
console.log("═══════════════════════════════════════════════════════════════════════════\n");
