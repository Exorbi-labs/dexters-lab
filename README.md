# Dexter's Lab

A simple, free Notion alternative for teams. One shared workspace where your team writes docs, tracks tasks, and keeps the code snippets everyone keeps re-asking for, all in one place.

![Dexter's Lab preview](docs/preview.png)

## What it is

Dexter's Lab is a lightweight team workspace built around three surfaces and a shared team directory:

- **Docs.** Notion-style nested pages with full-page writing, tags, and optional AI drafting.
- **Tasks.** A shared board (To do, In progress, Review, Done) with assignees, priorities, and due dates.
- **Codebase.** A library of code snippets and repository links your teammates keep re-asking for.
- **Team.** A member directory with roles, so everyone sees the same workspace tagged by who owns what.

A dashboard gives the team a live pulse, and settings surface which services are connected.

## Highlights

- Full-page, distraction-free editors for docs, tasks, and snippets that autosave as you type.
- Command palette (Cmd or Ctrl + K) to jump anywhere or start anything.
- Reversible actions everywhere. Every forward step has a quieter back step, and back steps never destroy your data.
- Everything a teammate wrote stays editable in place.
- Optional AI assist (draft a doc, summarize, explain code) that degrades gracefully when no key is set.
- Fully responsive, with a dedicated mobile navigation.

## Tech stack

- Next.js (App Router) and React
- Tailwind CSS v4 (design tokens defined inline in `app/globals.css`)
- TypeScript, strict mode
- HugeIcons for iconography
- Browser localStorage for persistence today, with a clean path to Postgres

## Getting started

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3000 and complete the short onboarding to create your first member.

### Scripts

- `npm run dev` starts the dev server (Turbopack)
- `npm run build` creates a production build
- `npm run start` serves the production build
- `npm run lint` runs ESLint

## Configuration

Copy the template and fill in keys as you go. Everything is optional; features degrade honestly when a key is missing.

```bash
cp .env.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `DEEPSEEK_API_KEY` | Budget AI lane (draft docs, explain code) |
| `ANTHROPIC_API_KEY` | Quality AI lane, preferred when both keys are set |
| `DATABASE_URL` | Postgres, replaces browser storage and syncs the team |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Team sign-in |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Link repositories into the codebase |
| `REDIS_URL` | Presence and realtime collaboration |

Connected services appear live under Settings, Services.

## Project structure

```
app/            Routes: landing, login, onboarding, and the /app workspace
  api/          Route handlers (assist, status)
  app/          The product: dashboard, docs, tasks, codebase, team, settings
components/     Shell (sidebar, mobile nav, command palette) and UI primitives
lib/            Data types, persistence layer, and service config
```

## Roadmap

- **Now.** Fully usable, client-side, with optional AI assist.
- **Phase 1.** Postgres plus Google sign-in for a real, synced team workspace.
- **Phase 2.** GitHub integration to pull repositories into the codebase.
- **Phase 3.** Presence and realtime collaboration.

## Status

Private beta. Data currently lives in the browser, so it is per device until the Phase 1 backend lands.
