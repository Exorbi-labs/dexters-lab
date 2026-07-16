# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Dexter's Lab — a simple, free Notion alternative for a company team. One shared workspace where the team collaborates on **Docs** (Notion-style nested pages), **Tasks** (a shared board), and a **Codebase** library (snippets + repo links), with a **Team** directory. Built as a team-framed sibling of the Selsa app (same architecture and quality bar, indigo re-brand). Current state: **fully client-side** — every collection starts empty and persists to browser localStorage (`lib/store.ts`); the current user is created during onboarding (`STORE_KEYS.me`). AI assist (draft doc / summarize / explain code) calls the real API via `app/api/assist/route.ts` (two provider lanes, needs a key in `.env.local`, degrades to 503). Pending later phases: Postgres + Google team sign-in, GitHub repo linking, realtime presence.

## Commands

- `npm run dev` — dev server (Turbopack)
- `npm run build` — production build (verify changes compile)
- `npx tsc --noEmit` — fast type-check
- `npm run lint` — ESLint

## Architecture

- Next.js App Router + Tailwind v4 (tokens via `@theme inline` in `app/globals.css` — no tailwind.config)
- `app/page.tsx` — marketing landing; `app/login`, `app/onboarding` — mocked auth (onboarding creates the workspace + first member)
- `app/app/*` — the product, wrapped by `app/app/layout.tsx`: dashboard, docs, tasks, codebase, team, settings. Shell = `components/sidebar.tsx` (desktop) + `components/mobile-nav.tsx` (sticky top bar + scrollable pill nav below `md`) + `components/command-palette.tsx` (⌘K: navigate + create; add new sections to its ITEMS list) + `app/app/template.tsx` (soft page-enter animation).
- `lib/mock-data.ts` — config + types ONLY (uid, ROLES, MEMBER_ACCENTS, initialsFrom, memberById, and types Member/Doc/Task/Snippet/Repo). No seed data — do not add any.
- `lib/store.ts` — persistence: `usePersistentState(key, initial)` → `[value, set, loaded]` (localStorage, hydration-safe — gate empty-states on `loaded`), `readStore`, `STORE_KEYS` (namespaced `dex:*`, incl. `me` = current member id).
- `app/api/assist/route.ts` — team AI helper (draft/summarize/explain) with Claude or DeepSeek lanes, auto-picked in `lib/env.ts → aiProvider()`. `lib/env.ts` + `app/api/status/route.ts` — service config surfaced in Settings → Services.
- Typing/planning happens on FULL-PAGE Notion-like editors, never cramped inline forms: `/app/docs/new` + `/[id]`, `/app/tasks/new` + `/[id]`, `/app/codebase/new` + `/[id]`. Editor grammar: max-w-3xl column, back-link + autosave microlabel top bar, huge borderless serif title textarea, quiet meta chip row, borderless body blocks. `/new` pages NEVER navigate while typing — generate a stable id in a ref on mount, lazily UPSERT under it once content is non-empty, flush pending saves on exit/unmount, list pages link to `/[id]`.
- `components/ui.tsx` — shared primitives: Chip, SectionHeader, Card, PillButton (href/onClick/disabled; ink/ghost/accent), Avatar, MemberBadge, StatusBadge, PageHeader, MockNote.

## Design system (do not drift)

White + electric indigo, editorial, light-weight type — the team sibling of Selsa's white+lemon.

- Colors as Tailwind classes: `ink`, `ink-muted`, `ink-faint`, `paper`, `accent` (#4F46E5 indigo), `accent-deep`, `accent-soft`, `accent-line`, `line`, `line-strong`. Indigo is the ONLY accent — actions, active states, small highlights. Members each get their own color from `MEMBER_ACCENTS` (used only on avatars/dots). No dark mode.
- Fonts (next/font in `app/layout.tsx`): the leading display face is a pronounced soft serif (Fraunces, SOFT 100, weight 600) via `.display` for headlines and `.serif-soft` for the wordmark — never thin. Jost is the supporting body/UI face (300–400). JetBrains Mono for `.microlabel` uppercase micro-labels and `.code` snippets.
- Icons: HugeIcons only (`@hugeicons/react` + `@hugeicons/core-free-icons`) via the `Icon` wrapper in `components/icon.tsx`. Verify any new name exists first (`grep -c "declare const XIcon" node_modules/@hugeicons/core-free-icons/dist/types/index.d.ts`). Verb mapping: add→Add01Icon, edit→PencilEdit02Icon, delete→Delete02Icon, save→Tick02Icon, cancel→Cancel01Icon, back-step→ArrowTurnBackwardIcon, advance→ArrowRight02Icon, AI→AiMagicIcon. No emoji icons except a Doc's own chosen page emoji.
- Visual grammar: generous whitespace, hairline `border-line` dividers, mono uppercase chips, pill buttons, rounded-2xl+ white cards, ink-dark CTAs.

## Product principles (owner-set, non-negotiable)

- Every status action is reversible: each forward step ships with a quieter back-step; back-steps never destroy attached data.
- Everything a team member wrote is inline-editable in place.
- AI is never the only path: any AI-generated artifact has a "do it myself" manual equivalent and stays editable after generation.
