// Test if activations produce expected defuzzified scores

function trap(x, a, b, c, d) {
  if (x <= a || x >= d) return 0;
  if (x >= b && x <= c) return 1;
  if (x < b) return (x - a) / (b - a);
  return (d - x) / (d - c);
}

function shoulderL(x, a, b) {
  if (x <= a) return 1;
  if (x >= b) return 0;
  return (b - x) / (b - a);
}

// Output MFs
const outLow = (x) => shoulderL(x, 0, 28);
const outMed = (x) => trap(x, 26, 34, 54, 62);
const outHigh = (x) => trap(x, 60, 68, 78, 84);
const outCrit = (x) => trap(x, 82, 88, 100, 100);

// Simulate defuzzification with only outCritical activated at 0.6
console.log("TEST: Defuzzify with only Critical activation=0.6");
console.log();

let num = 0, den = 0;
const steps = 600;

for (let i = 0; i <= steps; i++) {
  const x = (i / steps) * 100;
  const dx = 100 / steps;
  const mu = Math.min(outCrit(x), 0.6);
  num += x * mu * dx;
  den += mu * dx;
}

const defuzzValue = den === 0 ? 0 : num / den;
console.log(`Defuzzified score (Critical only, act=0.6): ${defuzzValue.toFixed(2)}`);
console.log();

if (defuzzValue >= 80) console.log("Code assigns: Critical ✓");
else if (defuzzValue >= 60) console.log("Code assigns: High ✓");
else console.log("Code assigns: " + (defuzzValue >= 30 ? "Medium" : "Low"));
