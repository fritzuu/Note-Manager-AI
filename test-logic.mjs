// Manually reproduce membership calculations
function shoulderL(x, a, b) {
  if (x <= a) return 1;
  if (x >= b) return 0;
  return (b - x) / (b - a);
}

function trap(x, a, b, c, d) {
  if (x <= a || x >= d) return 0;
  if (x >= b && x <= c) return 1;
  if (x < b) return (x - a) / (b - a);
  return (d - x) / (d - c);
}

function shoulderR(x, a, b) {
  if (x <= a) return 0;
  if (x >= b) return 1;
  return (x - a) / (b - a);
}

// Test case: deadline=3, importance=8, difficulty=7, progress=20, academicRisk=40
const dl = 3, imp = 8, dif = 7, pro = 20, ar = 40;

// Fuzzify all inputs
const dN = shoulderL(dl, 1, 6);
const dM = trap(dl, 4, 6, 8, 12);
const dF = shoulderR(dl, 8, 12);

const iL = shoulderL(imp, 2, 5);
const iM = trap(imp, 3.5, 5, 7.5, 9);
const iH = shoulderR(imp, 7, 9.5);

const diffE = shoulderL(dif, 2, 5);
const diffM = trap(dif, 3, 5, 7, 9);
const diffH = shoulderR(dif, 7, 10);

const pL = shoulderL(pro, 5, 35);
const pM = trap(pro, 25, 38, 62, 78);
const pH = shoulderR(pro, 65, 90);

const aL = shoulderL(ar, 15, 40);
const aM = trap(ar, 30, 42, 60, 74);
const aH = shoulderR(ar, 60, 90);
const aC = shoulderR(ar, 82, 100);

console.log("FUZZIFICATION TEST CASE");
console.log("Input: deadline=3d, importance=8/10, difficulty=7/10, progress=20%, academicRisk=40");
console.log();
console.log("Deadline memberships:");
console.log(`  dlNear(3) = ${dN.toFixed(4)}`);
console.log(`  dlMedium(3) = ${dM.toFixed(4)}`);
console.log(`  dlFar(3) = ${dF.toFixed(4)}`);
console.log();
console.log("Importance memberships:");
console.log(`  impLow(8) = ${iL.toFixed(4)}`);
console.log(`  impMedium(8) = ${iM.toFixed(4)}`);
console.log(`  impHigh(8) = ${iH.toFixed(4)}`);
console.log();
console.log("Difficulty memberships:");
console.log(`  difEasy(7) = ${diffE.toFixed(4)}`);
console.log(`  difMedium(7) = ${diffM.toFixed(4)}`);
console.log(`  difHard(7) = ${diffH.toFixed(4)}`);
console.log();
console.log("Progress memberships:");
console.log(`  proLow(20) = ${pL.toFixed(4)}`);
console.log(`  proMedium(20) = ${pM.toFixed(4)}`);
console.log(`  proHigh(20) = ${pH.toFixed(4)}`);
console.log();
console.log("Academic Risk memberships:");
console.log(`  arLow(40) = ${aL.toFixed(4)}`);
console.log(`  arMedium(40) = ${aM.toFixed(4)}`);
console.log(`  arHigh(40) = ${aH.toFixed(4)}`);
console.log(`  arCritical(40) = ${aC.toFixed(4)}`);
console.log();

// Test which rules fire
console.log("RULE FIRING ANALYSIS");
const rule1 = Math.min(dN, iH);
const rule2 = Math.min(dN, iM, aC);
const rule3 = Math.min(dN, iM, aH);
const rule4 = Math.min(dN, iM);

console.log("Rule 1 (Deadline Near + Importance High):");
console.log(`  strength = min(${dN.toFixed(4)}, ${iH.toFixed(4)}) = ${rule1.toFixed(4)}`);
console.log("Rule 2 (Deadline Near + Importance Medium + Academic Risk Critical):");
console.log(`  strength = min(${dN.toFixed(4)}, ${iM.toFixed(4)}, ${aC.toFixed(4)}) = ${rule2.toFixed(4)}`);
console.log("Rule 3 (Deadline Near + Importance Medium + Academic Risk High):");
console.log(`  strength = min(${dN.toFixed(4)}, ${iM.toFixed(4)}, ${aH.toFixed(4)}) = ${rule3.toFixed(4)}`);
console.log("Rule 4 (Deadline Near + Importance Medium):");
console.log(`  strength = min(${dN.toFixed(4)}, ${iM.toFixed(4)}) = ${rule4.toFixed(4)}`);
console.log();

// Calculate aggregation
const maxActivation = Math.max(rule1, rule2, rule3, rule4);
console.log(`ACTIVATION AGGREGATION (MAX): critical = ${maxActivation.toFixed(4)}`);
