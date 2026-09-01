# Next.js Hydration & Dehydration Safety Rules

Always adhere to the following principles across all React/Next.js components in this repository to prevent hydration mismatches:

## 1. Browser & LocalStorage Access
- Never read `window`, `document`, `navigator`, or `localStorage` during initial component render or in `useState(initialValue)`.
- Always read `localStorage` inside `useEffect` after mount, or guard with `useMounted()`.
- Default to SSR-safe deterministic initial values (e.g. `0`, `""`, `[]`, or `"grid"`).

## 2. Dates & Timestamps
- Dates and times rendered dynamically (e.g. `new Date()`, `.toLocaleDateString()`, `.toLocaleTimeString()`, `formatDateIndo()`) must have `suppressHydrationWarning` on their enclosing HTML tags.
- For dynamic live clocks or calendars, use `useMounted()` to render a skeleton/placeholder during SSR, or ensure the initial state is deterministic.

## 3. Valid HTML Nesting
- Do not nest `<p>` inside another `<p>`, or `<div>` inside `<p>`.
- Always use `<div>` or `<span>` for complex composite elements.
- Ensure tables include `<tbody>`.

## 4. Reusable `useMounted()` Hook
- Use `@/hooks/useMounted` for any component that needs to render client-specific views or conditional browser features safely without hydration mismatch.
