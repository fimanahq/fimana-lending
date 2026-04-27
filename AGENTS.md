## Project Overview
This is a lending application frontend.

Goals:
- Simple and clear user experience
- Accurate display of financial information
- Fast performance
- Maintainable component structure

Tech assumptions:
- TypeScript
- Component-based architecture
- REST API integration with NestJS backend
- Responsive design (mobile friendly)

Core features:
- loan application UI
- amortization schedule display
- payment tracking
- dashboard analytics
- borrower profile management

---

## Agent Mission
Help implement UI features, fix bugs, improve usability, and maintain consistency.

Prioritize:
1. correctness of displayed financial data
2. maintainability
3. UX clarity
4. performance
5. reuse of components

---

## Non-Negotiable Rules
- Do not implement financial formulas directly in UI if backend already provides them.
- Do not hardcode API URLs.
- Do not introduce new state libraries unless requested.
- Do not rewrite large components unless necessary.
- Always reuse existing UI patterns where possible.
- Always check for existing shared/reusable components before creating a new one.
- Do not duplicate common UI patterns such as buttons, inputs, modals, tables, cards, badges, and form controls.
- If an existing shared component is close to the requirement, extend it in a maintainable way instead of creating a separate duplicate.
- Do not change API request/response contracts without instruction.
- Avoid unnecessary dependencies.

---

## UI Architecture Rules
- Keep components small and reusable.
- Separate UI logic from business logic.
- Avoid deeply nested component trees.
- Prefer composition over inheritance.
- Keep forms modular.
- Avoid duplicate logic across pages.
- Reuse shared components for form fields, tables, modals, badges, cards, loading states, and empty states.
- Before creating a new component, inspect shared/ and existing feature components for a reusable pattern.
- Keep new feature components visually and behaviorally consistent with the shared component system.

Example structure:

components/
    loan/
    payment/
    shared/
pages/
services/
hooks/

---

## State Management Rules
- Keep state close to where it is used.
- Avoid global state unless necessary.
- Prefer simple patterns over complex abstractions.
- Cache server responses when appropriate.
- Avoid duplicated API calls.

---

## API Integration Rules
- All API calls must go through service layer.
- Never call API directly inside UI components if services exist.
- Handle loading and error states consistently.
- Do not silently swallow API errors.
- Always display meaningful error messages.

---

## Financial Data Rules
- Do not compute interest calculations in UI if backend provides values.
- Display currency consistently.
- Preserve decimal precision.
- Never round values prematurely.
- Always label financial values clearly.

Examples:
✔ principal
✔ interest
✔ penalty
✔ due date
✔ total balance

---

## Form Rules
- Validate required inputs.
- Provide clear error messages.
- Do not block user progress unnecessarily.
- Preserve user input during navigation when possible.

---

## Coding Standards

### General
- Use strict TypeScript typing.
- Avoid any unless necessary.
- Use descriptive variable names.
- Remove unused code.
- Keep functions short.

### Naming
Good:
LoanCard
PaymentScheduleTable
useLoanCalculator

Avoid:
DataComponent
HelperUtil

---

## Styling Rules
- Keep styles consistent.
- Avoid inline styles unless dynamic.
- Prefer reusable style classes.
- Maintain spacing consistency.

---

## Performance Rules
- Avoid unnecessary re-renders.
- Memoize expensive computations.
- Lazy load large components when appropriate.
- Avoid large bundle dependencies.

---

## Implementation Workflow
When implementing features:

1. inspect existing components
2. reuse patterns where possible
3. implement smallest working change
4. verify UI states:
   - loading
   - empty
   - error
   - success
5. ensure mobile compatibility
6. summarize changes

---

## Bug Fix Workflow
1. identify UI vs API issue
2. isolate affected component
3. fix root cause
4. avoid broad refactor
5. explain fix clearly

---

## Response Format
When generating frontend code:

1. explain approach briefly
2. provide component or hook code
3. specify affected files
4. note assumptions
5. keep response concise

---

## Things to Avoid
- duplicated components
- hidden business logic inside UI
- large monolithic components
- unnecessary libraries
- premature optimization

---

## Preferred Output Style
- clean readable components
- minimal boilerplate
- strongly typed props
- reusable hooks