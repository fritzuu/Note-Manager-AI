# Graph Report - Note-Manager-AI  (2026-08-31)

## Corpus Check
- 116 files · ~166,234 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 568 nodes · 1224 edges · 56 communities (21 shown, 35 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Dashboard UI & Overview
- Module: page.tsx
- Module: route.ts
- Task Management & Kanban
- Module: dom
- Pomodoro & Time Tracking
- Module: eslint
- Authentication & User Management
- AI Assistant & LLM Integrations
- Fuzzy Logic & Priority Engine
- Module: validate_monotonicity.mjs
- Fuzzy Logic & Priority Engine
- Note Editor & Tiptap Integration
- AI Assistant & LLM Integrations
- AI Assistant & LLM Integrations
- Module: run-ml.js
- Module: eda.py
- Module: proxy.ts
- AI Assistant & LLM Integrations
- Module: layout.tsx
- Authentication & User Management
- Dashboard UI & Overview
- Task Management & Kanban
- Task Management & Kanban
- Task Management & Kanban
- Module: eslint.config.mjs
- Firebase & Data Persistence
- Module: lucide-react
- Module: next
- Module: next.config.ts
- Module: react
- Module: react-dom
- AI Assistant & LLM Integrations
- Note Editor & Tiptap Integration
- Note Editor & Tiptap Integration
- Note Editor & Tiptap Integration
- Note Editor & Tiptap Integration
- Note Editor & Tiptap Integration
- Note Editor & Tiptap Integration
- Note Editor & Tiptap Integration
- Note Editor & Tiptap Integration
- Note Editor & Tiptap Integration
- Note Editor & Tiptap Integration
- Note Editor & Tiptap Integration
- Note Editor & Tiptap Integration
- Note Editor & Tiptap Integration
- Note Editor & Tiptap Integration
- Note Editor & Tiptap Integration
- Note Editor & Tiptap Integration
- Module: postcss.config.mjs
- AI Assistant & LLM Integrations

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 35 edges
2. `cn()` - 25 edges
3. `buildRules()` - 20 edges
4. `Button()` - 19 edges
5. `getMemberships()` - 18 edges
6. `computePriorityDetailed()` - 17 edges
7. `computePomodoroFocus()` - 16 edges
8. `compilerOptions` - 16 edges
9. `DashboardShell()` - 15 edges
10. `TaskDocument` - 15 edges

## Surprising Connections (you probably didn't know these)
- `r()` --calls--> `computePriority()`  [EXTRACTED]
  validate_monotonicity.mjs → src/lib/fuzzy/inference.ts
- `POST()` --calls--> `computePriority()`  [EXTRACTED]
  src/app/api/priority/route.ts → src/lib/fuzzy/inference.ts
- `AssessmentPage()` --calls--> `useAuth()`  [EXTRACTED]
  src/app/assessment/page.tsx → src/contexts/AuthContext.tsx
- `AssessmentPage()` --calls--> `saveAcademicInsight()`  [EXTRACTED]
  src/app/assessment/page.tsx → src/lib/firestore.ts
- `AcademicInsightPage()` --calls--> `useAuth()`  [EXTRACTED]
  src/app/insight/page.tsx → src/contexts/AuthContext.tsx

## Import Cycles
- None detected.

## Communities (56 total, 35 thin omitted)

### Community 0 - "Dashboard UI & Overview"
Cohesion: 0.07
Nodes (55): AnalyticsPage(), AssistantChatContent(), Message, DashboardContentImpl(), NoteDetailPage(), ParsedSummary, escapeRegExp(), Highlight() (+47 more)

### Community 1 - "Module: page.tsx"
Cohesion: 0.06
Nodes (42): AssessmentData, AssessmentPage(), STEPS, formatTime(), PomodoroContentImpl(), PRIORITY_BADGE, AcademicContextSection(), AIFlowSection() (+34 more)

### Community 2 - "Module: route.ts"
Cohesion: 0.14
Nodes (45): POST(), aggregateRules(), argmaxLevel(), CONSTRAINTS, DEFUZZIFICATION, OUTPUT_MF, defuzzify(), computePriority() (+37 more)

### Community 3 - "Task Management & Kanban"
Cohesion: 0.07
Nodes (41): TaskCardProps, AddWidgetModal(), AddWidgetModalProps, ICON_MAP, BentoGrid(), BentoGridProps, BentoItemWrapper(), BentoItemWrapperProps (+33 more)

### Community 4 - "Module: dom"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 5 - "Pomodoro & Time Tracking"
Cohesion: 0.15
Nodes (24): inter, metadata, PomodoroContext, PomodoroContextValue, PomodoroProvider(), completePomodoroSession(), createPomodoroSession(), deletePomodoroSession() (+16 more)

### Community 6 - "Module: eslint"
Cohesion: 0.07
Nodes (26): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+18 more)

### Community 7 - "Authentication & User Management"
Cohesion: 0.14
Nodes (19): LoginPage(), RegisterPage(), BRAND_CHARS, BrandingPanel(), GoogleButton(), GoogleButtonProps, Input, InputProps (+11 more)

### Community 8 - "AI Assistant & LLM Integrations"
Cohesion: 0.10
Nodes (17): AcademicInsightPage(), DashboardState, ConfidenceRing(), ConfidenceRingProps, CONFIG, InsightCard(), InsightCardProps, PerformanceMeter() (+9 more)

### Community 9 - "Fuzzy Logic & Priority Engine"
Cohesion: 0.16
Nodes (19): EditTaskPage(), PRIORITY_BG, PRIORITY_RING, riskBg(), riskColor(), riskLabel(), COLUMNS, deadlineColor() (+11 more)

### Community 10 - "Module: validate_monotonicity.mjs"
Cohesion: 0.10
Nodes (19): baseArInputs, baseDeadlineInputs, baseDifInputs, baseImpInputs, baseProInputs, bestCase, completed, deadlineSeries (+11 more)

### Community 11 - "Fuzzy Logic & Priority Engine"
Cohesion: 0.22
Nodes (16): cases, computeDebug(), deadlineBonus(), defuzzify(), evaluateRules(), mfHigh(), mfLow(), mfMedium() (+8 more)

### Community 12 - "Note Editor & Tiptap Integration"
Cohesion: 0.22
Nodes (9): clsx, dependencies, clsx, @tiptap/extension-text-style, @tiptap/extension-underline, @tiptap/pm, @tiptap/extension-text-style, @tiptap/extension-underline (+1 more)

### Community 13 - "AI Assistant & LLM Integrations"
Cohesion: 0.32
Nodes (7): load_artifacts(), main(), predict_student_performance(), MindFlow AI — Prediction Pipeline =================================== Loads the…, Read JSON from stdin, predict, output JSON to stdout., Load model, encoder, and scaler from disk., Predict a student's academic performance. Args: data: dict with keys matching…

### Community 14 - "AI Assistant & LLM Integrations"
Cohesion: 0.33
Nodes (6): BaseModel, get, predict(), read_root(), StudentAssessment, post

### Community 15 - "Module: run-ml.js"
Cohesion: 0.29
Nodes (5): appDir, child, { execSync, spawn }, path, pythonCmd

## Knowledge Gaps
- **158 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+153 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `computePriorityDetailed()` connect `Module: route.ts` to `Module: page.tsx`, `Module: validate_monotonicity.mjs`, `Fuzzy Logic & Priority Engine`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Dashboard UI & Overview` to `Module: page.tsx`, `Task Management & Kanban`, `Pomodoro & Time Tracking`, `AI Assistant & LLM Integrations`, `Fuzzy Logic & Priority Engine`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `Button()` connect `Module: page.tsx` to `Dashboard UI & Overview`, `Fuzzy Logic & Priority Engine`, `Task Management & Kanban`, `Authentication & User Management`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _158 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dashboard UI & Overview` be split into smaller, more focused modules?**
  _Cohesion score 0.07145501666049611 - nodes in this community are weakly interconnected._
- **Should `Module: page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05764145954521417 - nodes in this community are weakly interconnected._
- **Should `Module: route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14035087719298245 - nodes in this community are weakly interconnected._