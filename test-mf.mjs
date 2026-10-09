// Test membership function edge cases

function shoulderL(x, a, b) {
  if (x <= a) return 1;
  if (x >= b) return 0;
  return (b - x) / (b - a);
}

function shoulderR(x, a, b) {
  if (x <= a) return 0;
  if (x >= b) return 1;
  return (x - a) / (b - a);
}

function trap(x, a, b, c, d) {
  if (x <= a || x >= d) return 0;
  if (x >= b && x <= c) return 1;
  if (x < b) return (x - a) / (b - a);
  return (d - x) / (d - c);
}

console.log("TEST: Overlapping membership at boundary points");
console.log();

// Test deadline boundary
console.log("Deadline at critical boundary (6 days):");
console.log(`  dlNear(6) = ${shoulderL(6, 1, 6).toFixed(4)} (should be ~0)`);
console.log(`  dlMedium(6) = ${trap(6, 4, 6, 8, 12).toFixed(4)} (should be ~1)`);
console.log();

// Test importance boundary
console.log("Importance at boundary (7/10):");
console.log(`  impMedium(7) = ${trap(7, 3.5, 5, 7.5, 9).toFixed(4)} (should be ~1)`);
console.log(`  impHigh(7) = ${shoulderR(7, 7, 9.5).toFixed(4)} (should be ~0)`);
console.log();

// Test progress boundary
console.log("Progress at boundary (35%):");
console.log(`  proLow(35) = ${shoulderL(35, 5, 35).toFixed(4)} (should be ~0)`);
console.log(`  proMedium(35) = ${trap(35, 25, 38, 62, 78).toFixed(4)} (should be ~0.25)`);
console.log();

// Test academic risk boundary
console.log("Academic Risk at boundary (90):");
console.log(`  arHigh(90) = ${shoulderR(90, 60, 90).toFixed(4)} (should be ~1)`);
console.log(`  arCritical(90) = ${shoulderR(90, 82, 100).toFixed(4)} (should be ~1)`);
console.log();

// Check for problematic overlap - both High and Critical should not be 1.0 simultaneously
console.log("CRITICAL: Check arHigh vs arCritical overlap");
for (let risk = 75; risk <= 95; risk += 5) {
  const high = shoulderR(risk, 60, 90);
  const crit = shoulderR(risk, 82, 100);
  console.log(`  Risk=${risk}: arHigh=${high.toFixed(4)}, arCritical=${crit.toFixed(4)}, sum=${(high + crit).toFixed(4)}`);
}
console.log();

// Check output membership monotonicity
console.log("Output MF monotonicity check (should increase left-to-right):");
const outLow = (x) => shoulderL(x, 0, 28);
const outMed = (x) => trap(x, 26, 34, 54, 62);
const outHigh = (x) => trap(x, 60, 68, 78, 84);
const outCrit = (x) => trap(x, 82, 88, 100, 100);

console.log("  Score 0: Low=" + outLow(0).toFixed(2) + ", Med=" + outMed(0).toFixed(2) + ", High=" + outHigh(0).toFixed(2) + ", Crit=" + outCrit(0).toFixed(2));
console.log("  Score 30: Low=" + outLow(30).toFixed(2) + ", Med=" + outMed(30).toFixed(2) + ", High=" + outHigh(30).toFixed(2) + ", Crit=" + outCrit(30).toFixed(2));
console.log("  Score 60: Low=" + outLow(60).toFixed(2) + ", Med=" + outMed(60).toFixed(2) + ", High=" + outHigh(60).toFixed(2) + ", Crit=" + outCrit(60).toFixed(2));
console.log("  Score 90: Low=" + outLow(90).toFixed(2) + ", Med=" + outMed(90).toFixed(2) + ", High=" + outHigh(90).toFixed(2) + ", Crit=" + outCrit(90).toFixed(2));
