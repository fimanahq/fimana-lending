# AGENTS.md

## Purpose
- This repository is a `Next.js 15` + `React 19` + `TypeScript` app for FiMana Lending.
- Use `React MCP` and `Next MCP` as the primary source of truth before making framework-level decisions.

## Source Of Truth
- Use `React MCP` first for React API usage, component patterns, hooks behavior, client component guidance, and modern React 19 conventions.
- Use `Next MCP` first for App Router behavior, server/client boundaries, route handlers, metadata, caching, navigation, and Next-specific file conventions.
- If either MCP is unavailable, fall back to official React and Next.js documentation. Do not guess on framework behavior when the docs can answer it.

## Repo Rules
- Preserve the App Router structure under `app/`. Do not introduce Pages Router patterns.
- Prefer Server Components by default. Add `'use client'` only when interactivity, browser APIs, or client-only hooks require it.
- Keep route handlers in `app/api/**/route.ts`.
- Use the `@/*` import alias defined in `tsconfig.json`.
- Keep types strict and avoid `any` unless there is a documented reason.
- Reuse existing utilities and components in `components/` and `lib/` before creating new abstractions.
- Keep styling aligned with the existing global CSS approach in `app/globals.css` unless the task requires a broader refactor.

## Working Style
- Before changing React patterns, verify the approach in `React MCP`.
- Before changing routing, data fetching, metadata, images, middleware, or rendering behavior, verify the approach in `Next MCP`.
- Prefer minimal, targeted changes over broad rewrites.
- Do not remove or break the existing Figma-hosted image flow configured in `next.config.ts` unless the task explicitly requires it.

## Validation
- Run `pnpm typecheck` after TypeScript or React changes.
- Run `pnpm build` when changes affect routing, rendering, config, or deployment-sensitive behavior.
- Use `pnpm dev` for local verification when needed.

## Project Pointers
- Public pages live under `app/(public)`.
- Authenticated app pages live under `app/(app)`.
- Shared UI lives in `components/`.
- Domain and server utilities live in `lib/` and `lib/server/`.
