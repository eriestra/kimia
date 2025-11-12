# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains the Next.js App Router feature folders (`auth/`, `dashboard/`, shared providers, layout, and Tailwind globals); `/dashboard/calls` lists calls while `/dashboard/calls/new` hosts the multi-step creation wizard.
- `convex/` hosts backend logic: `schema.ts` for data models, `users.ts` and `calls.ts` for queries/mutations, and `_generated/` code emitted by Convex.
- `spec.md`, `userManual.md`, and `TESTING.md` document architecture, UX, and QA flows—review them before large changes.

## Build, Test & Development Commands
- `npm run dev` launches the Next.js dev server (Turbopack) on port 3000; keep this paired with the Convex dev process.
- `npx convex dev` starts the Convex backend locally; never run `npx convex deploy` unless you intend to hit production.
- `npm run build` performs a production build with type checking; use it to catch integration issues early.
- `npm run lint` runs the Next.js ESLint preset and auto-detects Tailwind class issues.

## Coding Style & Naming Conventions
- TypeScript is required; prefer functional React components with the "use client" directive where hooks run.
- Indent with two spaces, keep imports ordered by package → absolute → relative as in existing files.
- Use Tailwind utility classes for styling instead of custom CSS; extend tokens in `app/globals.css` only when shared.
- Name Convex functions with verb-first camelCase (e.g., `users.getCurrentUser`); keep files in kebab-case inside `app/` routes.

## Testing Guidelines
- Automated tests are not yet configured—validate features by following the checklists in `TESTING.md`.
- Always run `npx convex dev` + `npm run dev` and walk through auth, role-based navigation, and dashboard views before merging.
- Use `npm run build` and `npm run lint` prior to PRs to catch type or lint regressions.

## Commit & Pull Request Guidelines
- Follow the existing Git history: single-line sentence case subjects that describe the change (“Fix Tailwind v4 and Convex Auth setup”).
- Group related work per commit; include configuration or schema changes alongside their consumer code.
- PRs must summarize scope, reference the relevant sections of `spec.md` or open issues, and list manual test steps executed.
- Attach screenshots/GIFs when UI changes are visible, and call out any Convex migrations that need coordination.

## Security & Configuration Notes
- Keep secrets in `.env.local`; never commit API keys. Required vars include `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_OPENROUTER_API_KEY`, and `NEXT_PUBLIC_PLATFORM_URL`.
- When working with Convex, ensure `_generated/` stays in sync by restarting `npx convex dev` after schema changes.
