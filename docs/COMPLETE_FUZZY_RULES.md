# Complete Fuzzy Logic Rules - MindFlow AI

## PRIORITY ENGINE RULES (32 Total)

### GROUP 1: DEADLINE NEAR (Days < 6) - Rules 1-7

| No | Conditions | Conclusion | Output Level |
|----|-----------|-----------|--------------|
| 1 | Deadline Near + Importance High | Critical | Critical |
| 2 | Deadline Near + Importance Medium + Academic Risk Critical | Critical | Critical |
| 3 | Deadline Near + Importance Medium + Academic Risk High | Critical | Critical |
| 4 | Deadline Near + Importance Medium | Critical | Critical |
| 5 | Deadline Near + Importance Low + Progress Low | High | High |
| 6 | Deadline Near + Importance Low + Progress Medium | High | High |
| 7 | Deadline Near + Importance Low + Progress High | Medium | Medium |

---

### GROUP 2: DEADLINE MEDIUM (Days 6-12) - Rules 8-20

#### Importance High (Rules 8-13)
| No | Conditions | Conclusion | Output Level |
|----|-----------|-----------|--------------|
| 8 | Deadline Medium + Importance High + Progress Low | High | High |
| 9 | Deadline Medium + Importance High + Progress Medium | High | High |
| 10 | Deadline Medium + Importance High + Progress High + Academic Risk Critical | High | High |
| 11 | Deadline Medium + Importance High + Progress High + Academic Risk High | High | High |
| 12 | Deadline Medium + Importance High + Progress High + Academic Risk Medium | Medium | Medium |
| 13 | Deadline Medium + Importance High + Progress High + Academic Risk Low | Medium | Medium |

#### Importance Medium (Rules 14-16)
| No | Conditions | Conclusion | Output Level |
|----|-----------|-----------|--------------|
| 14 | Deadline Medium + Importance Medium + Difficulty Hard | High | High |
| 15 | Deadline Medium + Importance Medium + Difficulty Medium | Medium | Medium |
| 16 | Deadline Medium + Importance Medium + Difficulty Easy | Medium | Medium |

#### Importance Low (Rules 17-20)
| No | Conditions | Conclusion | Output Level |
|----|-----------|-----------|--------------|
| 17 | Deadline Medium + Importance Low + Academic Risk Critical | Medium | Medium |
| 18 | Deadline Medium + Importance Low + Academic Risk High | Medium | Medium |
| 19 | Deadline Medium + Importance Low + Academic Risk Medium | Low | Low |
| 20 | Deadline Medium + Importance Low + Academic Risk Low | Low | Low |

---

### GROUP 3: DEADLINE FAR (Days > 12) - Rules 21-28

#### Importance High (Rules 21-24)
| No | Conditions | Conclusion | Output Level |
|----|-----------|-----------|--------------|
| 21 | Deadline Far + Importance High + Academic Risk Critical | High | High |
| 22 | Deadline Far + Importance High + Academic Risk High | Medium | Medium |
| 23 | Deadline Far + Importance High + Academic Risk Medium | Medium | Medium |
| 24 | Deadline Far + Importance High + Academic Risk Low | Medium | Medium |

#### Importance Medium (Rules 25-27)
| No | Conditions | Conclusion | Output Level |
|----|-----------|-----------|--------------|
| 25 | Deadline Far + Importance Medium + Progress Low | Medium | Medium |
| 26 | Deadline Far + Importance Medium + Progress Medium | Low | Low |
| 27 | Deadline Far + Importance Medium + Progress High | Low | Low |

#### Importance Low (Rule 28)
| No | Conditions | Conclusion | Output Level |
|----|-----------|-----------|--------------|
| 28 | Deadline Far + Importance Low | Low | Low |

---

### GROUP 4: EXTREME CORNER CASES (Override Deadline Partition) - Rules 29-32

| No | Conditions | Conclusion | Output Level | Notes |
|----|-----------|-----------|--------------|-------|
| 29 | Academic Risk Critical + Progress Low + Deadline Medium | High | High | High risk must be addressed even with medium deadline |
| 30 | Academic Risk Critical + Progress Low + Deadline Far | High | High | High risk must be addressed even with far deadline |
| 31 | Academic Risk High + Importance High | Critical | Critical | Dangerous combination always critical |
| 32 | Academic Risk Critical + Importance Medium | Critical | Critical | Critical risk overrides medium importance |

---

## POMODORO TIMER ENGINE RULES (9 Total)

### Pomodoro Focus Duration Rules (Rules 1-9)

| ID | Conditions | Output | Focus Duration | Break Duration | Label |
|----|-----------|--------|-----------------|-----------------|-------|
| 1 | Priority High + Difficulty Hard | Long Focus | 50 minutes | 15 minutes | Long |
| 2 | Priority Medium + Difficulty Hard | Long Focus | 50 minutes | 15 minutes | Long |
| 3 | Priority Medium + Difficulty Medium | Medium Focus | 40 minutes | 10 minutes | Medium |
| 4 | Priority Low + Difficulty Easy | Short Focus | 25 minutes | 5 minutes | Short |
| 5 | Priority High + Difficulty Easy | Medium Focus | 40 minutes | 10 minutes | Medium |
| 6 | Priority High + Difficulty Medium | Medium Focus | 40 minutes | 10 minutes | Medium |
| 7 | Priority Low + Difficulty Medium | Short Focus | 25 minutes | 5 minutes | Short |
| 8 | Priority Low + Difficulty Hard | Medium Focus | 40 minutes | 10 minutes | Medium |
| 9 | Priority Medium + Difficulty Easy | Short Focus | 25 minutes | 5 minutes | Short |

### Special Case: Micro-Task Bypass
- **Condition**: estimatedTotalMinutes < 25 AND > 0
- **Output**: Set focus to exact remaining minutes, break = 5 min, label = "Micro"
- **Reason**: Don't force a full Pomodoro session if task < 25 min

---

## RULE ACTIVATION LOGIC

### Fuzzy Operators Used
- **AND (Conjunction)**: `Math.min(membershipA, membershipB)` - Takes minimum
- **OR (Aggregation)**: `Math.max(activationRule1, activationRule2)` - Takes maximum
- **Implication**: Mamdani MIN method - clips output MF by rule strength

### Defuzzification Method
- **Algorithm**: Centroid of Area (CoG)
- **Formula**: `CoG = Σ(x·μ(x)·dx) / Σ(μ(x)·dx)`
- **Priority Engine**: 600 sample points (high precision)
- **Pomodoro Engine**: 100 sample points (standard precision)

---

## RULE PRIORITY HIERARCHY

The rules follow a strict input hierarchy to prevent conflicts:

```
DEADLINE (highest priority - partitions entire space)
    ↓
IMPORTANCE (within each deadline partition)
    ↓
PROGRESS / DIFFICULTY (contextual modifiers)
    ↓
ACADEMIC RISK (cross-cutting concern + corner cases)
```

**Benefit**: Prevents rules from firing in inappropriate contexts
**Example**: "Deadline Far" rules never fire when deadline is actually "Near"

---

## MEMBERSHIP FUNCTION REFERENCE

### Priority Engine Input Membership Functions

**Deadline (days remaining, clamped 0-30)**
- dlNear(d): Shoulder-left at [1, 6] (high when d ≤ 1, zero when d ≥ 6)
- dlMedium(d): Trapezoid [4, 6, 8, 12] (plateau 6-8 days)
- dlFar(d): Shoulder-right at [8, 12] (zero when d ≤ 8, high when d ≥ 12)

**Importance (1-10 scale)**
- impLow(v): Shoulder-left at [2, 5]
- impMedium(v): Trapezoid [3.5, 5, 7.5, 9]
- impHigh(v): Shoulder-right at [7, 9.5]

**Difficulty (1-10 scale)**
- difEasy(v): Shoulder-left at [2, 5]
- difMedium(v): Trapezoid [3, 5, 7, 9]
- difHard(v): Shoulder-right at [7, 10]

**Progress (0-100%)**
- proLow(v): Shoulder-left at [5, 35]
- proMedium(v): Trapezoid [25, 38, 62, 78]
- proHigh(v): Shoulder-right at [65, 90]

**Academic Risk (0-100)**
- arLow(v): Shoulder-left at [15, 40]
- arMedium(v): Trapezoid [30, 42, 60, 74]
- arHigh(v): Shoulder-right at [60, 90]
- arCritical(v): Shoulder-right at [82, 100]

### Priority Engine Output Membership Functions

**Priority Score (0-100)**
- outLow(x): Shoulder-left at [0, 28] (plateau 0, zero at 28)
- outMedium(x): Trapezoid [26, 34, 54, 62] (plateau 34-54)
- outHigh(x): Trapezoid [60, 68, 78, 84] (plateau 68-78)
- outCritical(x): Trapezoid [82, 88, 100, 100] (plateau 88-100)

### Pomodoro Engine Input Membership Functions

**Priority Score (0-100)**
- priorityLow(p): Shoulder-left at [0, 40]
- priorityMedium(p): Triangle [25, 50, 75]
- priorityHigh(p): Shoulder-right at [55, 100]

**Difficulty (normalized to 0-1)**
- diffEasy(d): Shoulder-left at [1, 4.5]
- diffMedium(d): Triangle [3, 5.5, 8]
- diffHard(d): Shoulder-right at [6, 10]

### Pomodoro Engine Output Membership Functions

**Focus Duration (10-65 minutes)**
- shortFocus(x): Triangle [15, 25, 35] (centroid ≈ 25)
- mediumFocus(x): Triangle [30, 40, 50] (centroid ≈ 40)
- longFocus(x): Triangle [42, 50, 60] (centroid ≈ 50)

---

## THRESHOLDS & BOUNDARIES

### Priority Level Mapping (Priority Score)
- **Low**: 0-29
- **Medium**: 30-59
- **High**: 60-79
- **Critical**: 80-100

### Risk Level Classification (Derived)
- **Low**: Risk < 35
- **Medium**: Risk 35-54
- **High**: Risk 55-79
- **Critical**: Risk ≥ 80

### Pomodoro Duration Snapping
- rawMinutes < 33 → 25 min (Short)
- 33 ≤ rawMinutes < 45 → 40 min (Medium)
- rawMinutes ≥ 45 → 50 min (Long)

---

## RULE STATISTICS

**Priority Engine**
- Total Rules: 33
- Deadline-partitioned: 29 (1-29, partitioned by Near/Medium/Far)
- Corner cases: 4 (30-33, override partitions for extreme situations)
- Average rules per deadline partition: ~9.7
  - Near: 8 rules
  - Medium: 13 rules
  - Far: 8 rules
  - Extreme: 4 rules

**Pomodoro Engine**
- Total Rules: 9
- Combinations covered: 3 priority levels × 3 difficulty levels = 9 combinations
- All 9 combinations explicitly covered (complete rule matrix)

**Combined System**
- Total Rules: 33 + 9 = 42 rules
- Total Input Variables: 5 (Priority) + 2 (Pomodoro) = 7
- Total Output Levels: 4 (Priority) + 3 (Pomodoro) = 7

---

## RULE FIRING EXAMPLE

**Scenario**: User creates task with:
- deadline = 3 days (Near)
- importance = 8/10 (High)
- difficulty = 7/10 (Hard)
- progress = 20% (Low)
- academicRisk = 40% (Medium)

**Membership Calculations**:
- dlNear(3) = 0.60 ✓
- impHigh(8) = 0.40 ✓
- difHard(7) = 0.00 ✗
- proLow(20) = 0.50 ✓
- arMedium(40) = 0.83 ✓

**Rules That Fire**:
- Rule 1: min(0.60, 0.40) = 0.40 → Critical ✓ (Deadline Near + Importance High)
- Rule 4: min(0.60, 0.67) = 0.60 → Critical ✓ (Deadline Near + Importance Medium - impMedium evaluated)
- (No others meet threshold)

**Activation Levels**:
- low: 0.00
- medium: 0.00
- high: 0.00
- **critical: max(0.40, 0.60) = 0.60**

**Defuzzification**:
- Centroid of Critical MF (82-100) with activation 0.60
- Result ≈ 91.8 → **rounded to 92**
- Priority Level: **Critical** (≥ 80)

---

**Document Generated**: June 2026
**Fuzzy System Version**: 2.0 Mamdani
**Status**: Production (verified against codebase)
