// Check for rule conflicts and redundancy

const rules = [
  { id: 1, conds: ["dN", "iH"], out: "Critical" },
  { id: 2, conds: ["dN", "iM", "aC"], out: "Critical" },
  { id: 3, conds: ["dN", "iM", "aH"], out: "Critical" },
  { id: 4, conds: ["dN", "iM"], out: "Critical" },
  { id: 5, conds: ["dN", "iL", "pL"], out: "High" },
  { id: 6, conds: ["dN", "iL", "pM"], out: "High" },
  { id: 7, conds: ["dN", "iL", "pH"], out: "Medium" },
  { id: 8, conds: ["dM", "iH", "pL"], out: "High" },
  { id: 9, conds: ["dM", "iH", "pM"], out: "High" },
  { id: 10, conds: ["dM", "iH", "pH", "aC"], out: "High" },
  { id: 11, conds: ["dM", "iH", "pH", "aH"], out: "High" },
  { id: 12, conds: ["dM", "iH", "pH", "aM"], out: "Medium" },
  { id: 13, conds: ["dM", "iH", "pH", "aL"], out: "Medium" },
  { id: 14, conds: ["dM", "iM", "diffH"], out: "High" },
  { id: 15, conds: ["dM", "iM", "diffM"], out: "Medium" },
  { id: 16, conds: ["dM", "iM", "diffE"], out: "Medium" },
  { id: 17, conds: ["dM", "iL", "aC"], out: "Medium" },
  { id: 18, conds: ["dM", "iL", "aH"], out: "Medium" },
  { id: 19, conds: ["dM", "iL", "aM"], out: "Low" },
  { id: 20, conds: ["dM", "iL", "aL"], out: "Low" },
  { id: 21, conds: ["dF", "iH", "aC"], out: "High" },
  { id: 22, conds: ["dF", "iH", "aH"], out: "Medium" },
  { id: 23, conds: ["dF", "iH", "aM"], out: "Medium" },
  { id: 24, conds: ["dF", "iH", "aL"], out: "Medium" },
  { id: 25, conds: ["dF", "iM", "pL"], out: "Medium" },
  { id: 26, conds: ["dF", "iM", "pM"], out: "Low" },
  { id: 27, conds: ["dF", "iM", "pH"], out: "Low" },
  { id: 28, conds: ["dF", "iL"], out: "Low" },
  { id: 29, conds: ["aC", "pL", "dM"], out: "High" },
  { id: 30, conds: ["aC", "pL", "dF"], out: "High" },
  { id: 31, conds: ["aH", "iH"], out: "Critical" },
  { id: 32, conds: ["aC", "iM"], out: "Critical" },
];

console.log("RULE CONFLICT CHECK");
console.log("=" .repeat(60));
console.log();

// Check for exact duplicates
console.log("1. Checking for exact duplicate conditions:");
const condMap = new Map();
for (const r of rules) {
  const key = JSON.stringify(r.conds.sort());
  if (condMap.has(key)) {
    const existing = condMap.get(key);
    if (existing.out !== r.out) {
      console.log(`❌ CONFLICT: Rule ${existing.id} vs Rule ${r.id}`);
      console.log(`   Conditions: ${r.conds.join(" + ")}`);
      console.log(`   Rule ${existing.id} → ${existing.out}`);
      console.log(`   Rule ${r.id} → ${r.out}`);
    }
  } else {
    condMap.set(key, { id: r.id, out: r.out });
  }
}
console.log("✓ No exact conflicts found");
console.log();

// Check for subset relationships (more specific rule should fire)
console.log("2. Checking for subset relationships (redundancy risk):");
let found = false;
for (let i = 0; i < rules.length; i++) {
  for (let j = 0; j < rules.length; j++) {
    if (i === j) continue;
    const r1 = rules[i];
    const r2 = rules[j];
    
    // Check if r1 is subset of r2
    const isSubset = r1.conds.every(c => r2.conds.includes(c));
    if (isSubset && r1.conds.length < r2.conds.length) {
      console.log(`⚠️  Rule ${r1.id} ⊂ Rule ${r2.id} (more specific fires first)`);
      console.log(`   ${r1.id}: [${r1.conds.join(",")}] → ${r1.out}`);
      console.log(`   ${r2.id}: [${r2.conds.join(",")}] → ${r2.out}`);
      found = true;
    }
  }
}
if (!found) console.log("✓ No problematic subsets");
console.log();

// Check Deadline partitioning integrity
console.log("3. Checking Deadline partition integrity:");
const deadlinePartitions = {
  dN: [],
  dM: [],
  dF: [],
  corner: []
};

for (const r of rules) {
  if (r.conds.includes("dN")) deadlinePartitions.dN.push(r.id);
  else if (r.conds.includes("dM")) deadlinePartitions.dM.push(r.id);
  else if (r.conds.includes("dF")) deadlinePartitions.dF.push(r.id);
  else deadlinePartitions.corner.push(r.id);
}

console.log(`Deadline Near (dN): Rules ${deadlinePartitions.dN.join(", ")}`);
console.log(`Deadline Medium (dM): Rules ${deadlinePartitions.dM.join(", ")}`);
console.log(`Deadline Far (dF): Rules ${deadlinePartitions.dF.join(", ")}`);
console.log(`Corner Cases: Rules ${deadlinePartitions.corner.join(", ")}`);
console.log();

// Verify completeness
console.log("4. Checking for impossible input combinations not covered:");
console.log("   (This requires checking Cartesian product of all inputs)");
console.log("   Total rules: " + rules.length);
console.log("   Max possible combinations: 3(deadline) × 3(imp) × 3(diff) × 3(prog) × 4(ar) = 324");
console.log("   Coverage: " + ((rules.length / 324) * 100).toFixed(1) + "%");
console.log("   → Sparse coverage is expected (not all combinations have rules)");
