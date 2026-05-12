# Styling Guidelines

`app/globals.css` is the only global stylesheet imported by the Next root layout. It should stay as an import manifest, with global CSS grouped under `app/styles/`.

Use global CSS only for:

- design tokens in `tokens.css`
- browser and element defaults in `base.css`
- app-wide layout helpers in `layout.css`
- intentionally shared primitives in `primitives.css`

Use CSS Modules for component-owned styling. Place the module beside the component, import it as `styles`, and compose it with public `className` props using `classNames()`.

Feature/page styles that still live in `feature-styles.css` are migration backlog. When a feature component is touched, move its private selectors into a colocated `.module.css` file instead of adding new selectors to `feature-styles.css`.
