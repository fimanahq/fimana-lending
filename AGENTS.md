# FiMana Lending Agent Guide

## Scope and priorities

This repository is the FiMana lending frontend: Next.js 15, React 19, TypeScript, CSS Modules, and pnpm. Work as a frontend engineer. Preserve API contracts unless the user explicitly asks to change them.

Prioritize, in order:

1. Correct financial data and user-visible behavior
2. Maintainable, locally consistent code
3. Clear, accessible, responsive UX
4. Performance and bundle size

## Repository map

- `app/(app)/`: authenticated routes
- `app/(public)/`: public routes
- `app/api/`: route handlers and proxies
- `modules/`: feature entrypoints used by pages
- `components/shared/`: reusable UI primitives and patterns
- `components/<feature>/`: feature-specific UI
- `services/`: frontend API client and service layer
- `types/`: API and domain types
- `lib/server/`: server-side request helpers
- `lib/format.ts`: shared money, date, and number formatting
- `docs/styling.md`: styling conventions

## Implementation rules

- Inspect adjacent feature code and `components/shared/` before adding a component, dialog, form control, table, loading state, or empty state.
- Extend a close shared component when that keeps the API and behavior clear; do not duplicate common UI patterns.
- Keep components focused. Put API access in `services/` or `lib/server/`, not directly in UI components.
- Use Server Components by default. Add `"use client"` only when the code needs browser APIs, event handlers, or client-side state.
- Keep state close to its consumer. Do not add a state-management library or dependency without a clear need and user approval.
- Do not hardcode API URLs or change API request/response contracts without instruction.
- Do not silently swallow errors. Use the feature's established loading, empty, error, and success states, with actionable user-facing errors.
- Prefer the smallest coherent change. Avoid broad rewrites, speculative abstractions, and premature memoization.

## Financial data

- Treat backend-provided financial values as the source of truth; do not recreate interest, penalty, balance, or amortization calculations in the UI.
- Preserve supplied precision and never round values before display.
- Format money, dates, and numbers with existing helpers in `lib/format.ts`.
- Label financial values unambiguously, including principal, interest, penalties, due dates, and total balance.

## Forms and UX

- Use the existing validation and form patterns for the feature.
- Provide clear, field-level validation and meaningful submission errors.
- Preserve in-progress input when navigation or the established feature behavior supports it.
- Check mobile layouts and keyboard/accessibility behavior when changing interactive UI.

## Styling

- Follow `docs/styling.md`.
- Keep `app/globals.css` as an import manifest. Global styles belong only in the appropriate `app/styles/` token, base, layout, or shared-primitive file.
- Put component-owned styles in colocated `.module.css` files.
- Do not add private feature selectors to `app/styles/feature-styles.css`; migrate touched feature-private selectors to a colocated module when practical.
- Avoid inline styles except for genuinely dynamic values. Reuse existing spacing, color, and typography patterns.

## Verification

- Run the narrowest meaningful check for the change. Do not modify or add automated test files unless the user explicitly requests test work.
- Prefer these checks when applicable:

  ```bash
  pnpm typecheck
  pnpm build
  pnpm test
  ```

- Verify affected UI states: loading, empty, error, success, and responsive behavior.
- Report checks that were not run and why.

## Final response

Keep the handoff concise. State the files changed, the user-visible outcome, verification performed, and any API-contract or migration implications.
