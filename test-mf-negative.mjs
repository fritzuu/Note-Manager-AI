// Test for negative slopes in membership functions (division sign errors)

function shoulderL(x, a, b) {
  if (x <= a) return 1;
  if (x >= b) return 0;
  return (b - x) / (b - a);  // b - a should be POSITIVE
}

function shoulderR(x, a, b) {
  if (x <= a) return 0;
  if (x >= b) return 1;
  return (x - a) / (b - a);  // x - a, b - a both positive when a < x < b
}

function trap(x, a, b, c, d) {
  if (x <= a || x >= d) return 0;
  if (x >= b && x <= c) return 1;
  if (x < b) return (x - a) / (b - a);      // rising slope: should be positive
  return (d - x) / (d - c);                  // falling slope: should be positive
}

console.log("TEST: Check for negative slope bugs");
console.log();

// Test shoulderL: should decrease from 1 to 0
console.log("shoulderL(x, 1, 6) - should go 1→0:");
for (let x = 0; x <= 7; x++) {
  const val = shoulderL(x, 1, 6);
  console.log(`  x=${x}: ${val.toFixed(4)}`);
  if (x > 0 && x < 7) {
    // Check monotonicity
    const prev = shoulderL(x - 0.1, 1, 6);
    if (val > prev) console.log(`    ERROR: not decreasing!`);
  }
}
console.log();

// Test shoulderR: should increase from 0 to 1
console.log("shoulderR(x, 60, 90) - should go 0→1:");
const testVals = [50, 60, 70, 80, 90, 100];
for (let x of testVals) {
  const val = shoulderR(x, 60, 90);
  console.log(`  x=${x}: ${val.toFixed(4)}`);
}
console.log();

// Test trap rise/fall slopes
console.log("trap(x, 3, 5, 7, 9) - should go 0→1→0:");
for (let x = 2; x <= 10; x++) {
  const val = trap(x, 3, 5, 7, 9);
  console.log(`  x=${x}: ${val.toFixed(4)}`);
}
console.log();

// Check for division by zero in trap
console.log("Division by zero check in trap:");
console.log(`  trap(5, 5, 5, 7, 9) with (b-a)=0: ${trap(5, 5, 5, 7, 9)}`);  // Should be 1 (in plateau)
