# User design preferences

- Keep Kanban as the default Tasks view. Preserve the board, drag between statuses, workspace management, and existing task features when redesigning.
- Use `src/components/ui/Dropdown.tsx` and its shared styles for selection menus throughout the app. Keep trigger styling, popup surfaces, spacing, selected states, and keyboard interactions consistent. Local styles may adjust dimensions, but should not create a different dropdown design. Widget size menus use this component through `WidgetSizePicker`.
- Use short, natural Indonesian in product interfaces. Keep algorithm terminology out of the primary user flow without removing the underlying calculations or useful details.
- The user wants to inspect results themselves. Do not independently open previews, browse the local app, run builds, lint, or tests unless the user later requests verification. Reading source to implement changes is allowed.

- Keep the learning streak on the dashboard and derive its active days from screen time. Do not add a separate Pomodoro streak; Pomodoro tracks focus sessions and task progress.

- Pomodoro time is separate from task completion. Start progress check-ins at the last saved value; time-based estimates are optional and capped below 100%. Require an explicit task-complete choice for 100%. Keep actual elapsed time for early endings/resets while counting only full sessions as completed.

- Public entry and landing pages must render without waiting for authentication or showing a page loader. Initial data loaders use the shared LoadingScreen, including its delayed reveal; keep request/action feedback separate from page loading.
