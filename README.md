# Draftboard

Local-first collaborative document editor built for the House of Edtech full-stack assignment.

## Features

- Offline-first editing with IndexedDB as the primary client cache
- Installable PWA + service worker: the app shell and visited documents load with no network
- Offline-safe bootstrap that never overwrites unsynced local edits on reload
- Background sync queue with deterministic operation merging, auto-reconciled on reconnect
- Version snapshots with safe restore flow
- Role-based access: owner, editor, viewer (viewers cannot push sync updates)
- Strict Zod validation and payload size limits on sync APIs
- Connection status indicators (online, offline, syncing, error) with a manual "Retry sync"
- Optional AI summarize/improve actions via OpenAI
- PostgreSQL persistence with optional RLS policies

## Stack

- Next.js 16 App Router
- TypeScript
- React + Tailwind + shadcn/ui
- Auth.js (JWT credentials)
- Prisma + PostgreSQL
- Vitest for sync engine unit tests

## Getting started

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Start PostgreSQL and set `DATABASE_URL`.

3. Install dependencies and migrate:

```bash
npm install --legacy-peer-deps
npx prisma db push
```

4. Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` - local development
- `npm run build` - production build
- `npm run test` - sync and validation unit tests
- `npm run lint` - ESLint

## Architecture notes

### Local-first flow

1. Edits update React state immediately.
2. Diff operations are written to IndexedDB and queued.
3. Sync engine debounces pushes to `/api/docs/[docId]/sync`.
4. Server stores ops, rebuilds canonical content, and returns merged state.
5. Client clears acknowledged ops and refreshes local cache.

### Conflict resolution

Operations are ordered by vector clock, then `clientId`, then `seq`. Replaying sorted ops produces the same document for every peer.

### Security

- Auth required for protected routes and APIs
- Viewer role blocked from sync writes
- Payload byte cap and per-op limits prevent abusive sync requests
- Optional `prisma/rls.sql` for PostgreSQL tenant isolation

## Deployment

Deploy to Vercel and configure:

- `DATABASE_URL` — Supabase **transaction** pooler (`:6543?pgbouncer=true&connection_limit=1`)
- `DIRECT_URL` — Supabase session pooler (`:5432`) for migrations only
- `AUTH_SECRET`
- `AUTH_SECRET`
- `AUTH_URL` (your production URL on Vercel, e.g. `https://your-app.vercel.app`)
- `OPENAI_API_KEY` (optional)
- `NEXT_PUBLIC_AUTHOR_NAME`
- `NEXT_PUBLIC_GITHUB_URL`
- `NEXT_PUBLIC_LINKEDIN_URL`

CI runs on push via GitHub Actions (`.github/workflows/ci.yml`).

## Submission footer

Set the public profile env vars so the deployed footer shows your name, GitHub, and LinkedIn links.
