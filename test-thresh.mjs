// Check threshold alignment with MF parameters

const OUTPUT_MF = {
  LOW: { a: 0, b: 28 },
  MEDIUM: { a: 26, b: 34, c: 54, d: 62 },
  HIGH: { a: 60, b: 68, c: 78, d: 84 },
  CRITICAL: { a: 82, b: 88, c: 100, d: 100 },
};

console.log("Output MF Anchor Points:");
console.log("  LOW: [0, 28]");
console.log("  MEDIUM: [26, 34, 54, 62]");
console.log("  HIGH: [60, 68, 78, 84]");
console.log("  CRITICAL: [82, 88, 100, 100]");
console.log();

console.log("Code Thresholds for priorityLevel:");
console.log("  score >= 80 → Critical");
console.log("  score >= 60 → High");
console.log("  score >= 30 → Medium");
console.log("  score < 30 → Low");
console.log();

console.log("ANALYSIS:");
console.log("❌ Threshold 80 vs MF CRITICAL starts at 82 (MISMATCH by 2)");
console.log("✓ Threshold 60 matches MF HIGH starts at 60");
console.log("❌ Threshold 30 vs MF MEDIUM center around 40 (MISMATCH by 10)");
console.log("  -> Would classify score 35 as 'Medium' but MF says LOW");
console.log();
console.log("CONSEQUENCE:");
console.log("  Score 79: priorityLevel='High' but MF outHigh(79)≈0.79");
console.log("  Score 81: priorityLevel='High' but should be 'Critical'");
console.log("  Score 30: priorityLevel='Medium' but MF mostly in Low range");
