/**
 * pomodoroFuzzy.ts
 * Fuzzy Logic engine for Pomodoro recommended focus duration.
 *
 * Inputs:
 *   - priorityScore: 0–100 (from main fuzzy engine)
 *   - difficulty: 1–10
 *
 * Output:
 *   - recommendedMinutes: 25 | 40 | 50
 *   - label: "Short" | "Medium" | "Long"
 */

function trapLeft(x: number, a: number, b: number): number {
  if (x <= a) return 1;
  if (x >= b) return 0;
  return (b - x) / (b - a);
}

function trapRight(x: number, a: number, b: number): number {
  if (x <= a) return 0;
  if (x >= b) return 1;
  return (x - a) / (b - a);
}

function tri(x: number, a: number, b: number, c: number): number {
  if (x <= a || x >= c) return 0;
  if (x <= b) return (x - a) / (b - a);
  return (c - x) / (c - b);
}

// Priority fuzzy sets (0–100)
function priorityLow(p: number) { return trapLeft(p, 0, 40); }
function priorityMedium(p: number) { return tri(p, 25, 50, 75); }
function priorityHigh(p: number) { return trapRight(p, 55, 100); }

// Difficulty fuzzy sets (1–10)
function diffEasy(d: number) { return trapLeft(d, 1, 4.5); }
function diffMedium(d: number) { return tri(d, 3, 5.5, 8); }
function diffHard(d: number) { return trapRight(d, 6, 10); }

// Output focus sets (in minutes: 0–60)
function shortFocus(x: number) { return tri(x, 15, 25, 35); }
function mediumFocus(x: number) { return tri(x, 30, 40, 50); }
function longFocus(x: number) { return tri(x, 42, 50, 60); }

export interface PomodoroFuzzyResult {
  recommendedMinutes: number;
  label: "Short" | "Medium" | "Long";
  breakMinutes: number;
}

export function computePomodoroFocus(priorityScore: number, difficulty: number): PomodoroFuzzyResult {
  const pLow = priorityLow(priorityScore);
  const pMed = priorityMedium(priorityScore);
  const pHigh = priorityHigh(priorityScore);

  const dEasy = diffEasy(difficulty);
  const dMed = diffMedium(difficulty);
  const dHard = diffHard(difficulty);

  let shortAct = 0;
  let medAct = 0;
  let longAct = 0;

  // Rule 1: IF Priority High AND Difficulty Hard THEN Long Focus
  longAct = Math.max(longAct, Math.min(pHigh, dHard));

  // Rule 2: IF Priority Medium AND Difficulty Hard THEN Long Focus
  longAct = Math.max(longAct, Math.min(pMed, dHard));

  // Rule 3: IF Priority Medium AND Difficulty Medium THEN Medium Focus
  medAct = Math.max(medAct, Math.min(pMed, dMed));

  // Rule 4: IF Priority Low AND Difficulty Easy THEN Short Focus
  shortAct = Math.max(shortAct, Math.min(pLow, dEasy));

  // Rule 5: IF Priority High AND Difficulty Easy THEN Medium Focus
  medAct = Math.max(medAct, Math.min(pHigh, dEasy));

  // Additional coverage rules
  // Rule 6: IF Priority High AND Difficulty Medium THEN Medium Focus
  medAct = Math.max(medAct, Math.min(pHigh, dMed));

  // Rule 7: IF Priority Low AND Difficulty Medium THEN Short Focus
  shortAct = Math.max(shortAct, Math.min(pLow, dMed));

  // Rule 8: IF Priority Low AND Difficulty Hard THEN Medium Focus
  medAct = Math.max(medAct, Math.min(pLow, dHard));

  // Defuzzify (centroid)
  let numerator = 0;
  let denominator = 0;
  const steps = 100;

  for (let i = 0; i <= steps; i++) {
    const x = 10 + (i / steps) * 55; // range 10–65
    const mu = Math.max(
      Math.min(shortAct, shortFocus(x)),
      Math.min(medAct, mediumFocus(x)),
      Math.min(longAct, longFocus(x))
    );
    numerator += x * mu;
    denominator += mu;
  }

  const rawMinutes = denominator === 0 ? 25 : numerator / denominator;

  // Snap to nearest standard duration
  let recommendedMinutes: number;
  let label: "Short" | "Medium" | "Long";
  if (rawMinutes < 33) { recommendedMinutes = 25; label = "Short"; }
  else if (rawMinutes < 45) { recommendedMinutes = 40; label = "Medium"; }
  else { recommendedMinutes = 50; label = "Long"; }

  const breakMinutes = label === "Long" ? 15 : label === "Medium" ? 10 : 5;

  return { recommendedMinutes, label, breakMinutes };
}
