# Graph Report - Note-Manager-AI  (2026-08-31)

## Corpus Check
- 120 files · ~166,580 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 617 nodes · 1271 edges · 58 communities (23 shown, 35 thin omitted)
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
- Module: route.ts
- Module: layout.tsx
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
- Module: route.ts
- Module: route.ts
- Community 57

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
  scripts/validate_monotonicity.mjs → web/src/lib/fuzzy/inference.ts
- `RecentNotesBentoWidgetProps` --references--> `NoteDocument`  [EXTRACTED]
  web/src/components/dashboard/bento/widgets/RecentNotesBentoWidget.tsx → web/src/lib/firestore.ts
- `POST()` --calls--> `computePriority()`  [EXTRACTED]
  web/src/app/api/priority/route.ts → web/src/lib/fuzzy/inference.ts
- `AssessmentPage()` --calls--> `useAuth()`  [EXTRACTED]
  web/src/app/assessment/page.tsx → web/src/contexts/AuthContext.tsx
- `AcademicInsightPage()` --calls--> `useAuth()`  [EXTRACTED]
  web/src/app/insight/page.tsx → web/src/contexts/AuthContext.tsx

## Import Cycles
- None detected.

## Communities (58 total, 35 thin omitted)

### Community 0 - "Dashboard UI & Overview"
Cohesion: 0.07
Nodes (58): AnalyticsPage(), AssistantChatContent(), Message, DashboardContentImpl(), NoteDetailPage(), ParsedSummary, escapeRegExp(), Highlight() (+50 more)

### Community 1 - "Module: page.tsx"
Cohesion: 0.07
Nodes (42): TaskCardProps, AddWidgetModal(), AddWidgetModalProps, ICON_MAP, BentoGridProps, BentoItemWrapper(), BentoItemWrapperProps, BentoWidgetConfig (+34 more)

### Community 2 - "Module: route.ts"
Cohesion: 0.14
Nodes (45): POST(), aggregateRules(), argmaxLevel(), CONSTRAINTS, DEFUZZIFICATION, OUTPUT_MF, defuzzify(), computePriority() (+37 more)

### Community 3 - "Task Management & Kanban"
Cohesion: 0.06
Nodes (27): AssessmentData, AssessmentPage(), STEPS, AcademicInsightPage(), DashboardState, ConfidenceRing(), ConfidenceRingProps, CONFIG (+19 more)

### Community 4 - "Module: dom"
Cohesion: 0.09
Nodes (27): formatTime(), PomodoroContentImpl(), PRIORITY_BADGE, AcademicContextSection(), AIFlowSection(), CreateTaskPage(), FuzzyRulesSection(), PipelineStep() (+19 more)

### Community 5 - "Pomodoro & Time Tracking"
Cohesion: 0.12
Nodes (27): inter, metadata, formatTime(), PomodoroBentoWidget(), PomodoroContext, PomodoroContextValue, PomodoroProvider(), usePomodoro() (+19 more)

### Community 6 - "Module: eslint"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 7 - "Authentication & User Management"
Cohesion: 0.07
Nodes (23): { app, BrowserWindow, shell }, path, author, description, devDependencies, electron, electron-builder, desktop (+15 more)

### Community 8 - "AI Assistant & LLM Integrations"
Cohesion: 0.07
Nodes (26): eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom, typescript (+18 more)

### Community 9 - "Fuzzy Logic & Priority Engine"
Cohesion: 0.17
Nodes (17): LoginPage(), RegisterPage(), BRAND_CHARS, BrandingPanel(), GoogleButton(), GoogleButtonProps, Button(), ButtonProps (+9 more)

### Community 10 - "Module: validate_monotonicity.mjs"
Cohesion: 0.09
Nodes (21): concurrently, devDependencies, concurrently, desktop, name, private, scripts, build (+13 more)

### Community 11 - "Fuzzy Logic & Priority Engine"
Cohesion: 0.16
Nodes (19): EditTaskPage(), PRIORITY_BG, PRIORITY_RING, riskBg(), riskColor(), riskLabel(), COLUMNS, deadlineColor() (+11 more)

### Community 12 - "Note Editor & Tiptap Integration"
Cohesion: 0.10
Nodes (19): baseArInputs, baseDeadlineInputs, baseDifInputs, baseImpInputs, baseProInputs, bestCase, completed, deadlineSeries (+11 more)

### Community 13 - "AI Assistant & LLM Integrations"
Cohesion: 0.22
Nodes (16): cases, computeDebug(), deadlineBonus(), defuzzify(), evaluateRules(), mfHigh(), mfLow(), mfMedium() (+8 more)

### Community 14 - "AI Assistant & LLM Integrations"
Cohesion: 0.22
Nodes (9): clsx, firebase, @tiptap/react, @tiptap/starter-kit, dependencies, clsx, firebase, @tiptap/react (+1 more)

### Community 15 - "Module: run-ml.js"
Cohesion: 0.32
Nodes (7): load_artifacts(), main(), predict_student_performance(), MindFlow AI — Prediction Pipeline =================================== Loads the…, Read JSON from stdin, predict, output JSON to stdout., Load model, encoder, and scaler from disk., Predict a student's academic performance. Args: data: dict with keys matching…

### Community 16 - "Module: eda.py"
Cohesion: 0.33
Nodes (6): BaseModel, get, predict(), read_root(), StudentAssessment, post

### Community 17 - "Module: proxy.ts"
Cohesion: 0.29
Nodes (5): appDir, child, { execSync, spawn }, path, pythonCmd

## Knowledge Gaps
- **192 isolated node(s):** `{ app, BrowserWindow, shell }`, `path`, `name`, `version`, `description` (+187 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `computePriorityDetailed()` connect `Module: route.ts` to `Fuzzy Logic & Priority Engine`, `Note Editor & Tiptap Integration`, `Module: dom`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Dashboard UI & Overview` to `Module: page.tsx`, `Task Management & Kanban`, `Module: dom`, `Pomodoro & Time Tracking`, `Fuzzy Logic & Priority Engine`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `Button()` connect `Fuzzy Logic & Priority Engine` to `Dashboard UI & Overview`, `Module: page.tsx`, `Task Management & Kanban`, `Module: dom`, `Pomodoro & Time Tracking`, `Fuzzy Logic & Priority Engine`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `{ app, BrowserWindow, shell }`, `path`, `name` to the rest of the system?**
  _192 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dashboard UI & Overview` be split into smaller, more focused modules?**
  _Cohesion score 0.0673274094326726 - nodes in this community are weakly interconnected._
- **Should `Module: page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06594071385359952 - nodes in this community are weakly interconnected._
- **Should `Module: route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14035087719298245 - nodes in this community are weakly interconnected._