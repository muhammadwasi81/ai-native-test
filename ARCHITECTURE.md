# Architecture Note

This is a short narrative of how the app is put together and the tradeoffs I
made deliberately. The full design spec lives at
[`docs/superpowers/specs/2026-05-21-collab-doc-editor-design.md`](./docs/superpowers/specs/2026-05-21-collab-doc-editor-design.md).

## What I optimized for

A 4–6 hour assignment punishes architectural cleverness. I optimized for:

1. **One deployable artifact.** A single Next.js app means one repo, one
   deploy, one set of env vars, one log stream. No service boundary I had to
   build twice.
2. **Demonstrable end-to-end correctness.** Real users, real DB, real
   sharing — not in-memory state. The integration test verifies the most
   important invariant (authorization) so a reviewer can run `pnpm test` and
   trust it.
3. **Reviewer ergonomics.** Seeded users, a shared welcome doc on first
   login, a deploy URL anyone can click. Local setup is `docker compose
   up && pnpm dev`.

## Stack decisions

| Concern        | Choice                                | Why                                                                                                                  |
| -------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Framework      | Next.js 14 App Router                 | One repo for UI + API. Server Components for auth-gated reads. Vercel is one click.                                  |
| Editor         | TipTap + StarterKit + Underline       | ProseMirror semantics, React API, smallest setup for B/I/U/H/lists. Stores doc as JSON, not HTML.                    |
| DB             | Postgres via Prisma                   | Json column type fits TipTap docs. Same provider locally (Docker) and in prod (Neon).                                |
| Auth           | NextAuth v5 (Credentials)             | Demonstrates real session handling without OAuth-provider setup pain. JWT in httpOnly cookie.                        |
| Upload parser  | mammoth (.docx) + marked (.md)        | Battle-tested converters that emit clean HTML. `@tiptap/html` + jsdom turns the HTML into TipTap JSON server-side.   |
| Test runner    | Vitest                                | Same TS config as the app, fast, native ESM. The test hits the route handlers directly.                              |

## Data model

Three tables, one composite unique index:

```
User      ─┐                       ┌── shares (cascade on delete)
           │                       │
           │ ownerId ────► Document
           │                       ▲
           └────► Share ───────────┘
                   @@unique(documentId, userId)
```

Cascade on owner-delete cleans up documents and shares. Cascade on
document-delete cleans up shares. Cascade on user-delete cleans up shares.

`Document.content` is a `Json` column. TipTap reads/writes its own JSON shape
directly, no extra serialization layer.

## Authorization model

Two checks live in `src/lib/api.ts`:

1. `requireUser()` — pulls the session and 401s if missing.
2. `loadAccessibleDocument(id, userId, { requireOwner? })` — loads the
   document or throws `HttpError(404)` / `HttpError(403)`. Owner-only routes
   pass `requireOwner: true`.

Every documents/shares route calls both. The integration test verifies:

- Owner can CRUD their docs
- Recipient can read + edit but cannot manage shares
- Non-collaborator gets 403
- Revoked share immediately removes access
- Unauthenticated request gets 401
- Sharing with a non-existent email gets 404
- Non-owner cannot list shares

## Frontend shape

- `(app)/` route group hosts the authenticated UI; its layout calls `auth()`
  server-side and redirects if missing
- `(app)/documents/page.tsx` queries Prisma directly in a server component
  (no API round-trip on first paint) and ships serialized timestamps to the
  client-side list
- `(app)/documents/[id]/page.tsx` does the same, plus the access check;
  client component takes over for the editor itself
- `middleware.ts` only handles the redirect for unauthenticated clients (defense
  in depth — server components also check)

## Autosave

The editor's `onUpdate` schedules a PATCH with the new TipTap JSON on an
800 ms trailing debounce. The UI shows a small Saving / Saved / Error pill so
the user knows their state. Title saves on blur. Conflict resolution is
last-write-wins — documented because it'd be the first real-time concern in a
follow-up.

## File upload pipeline

`POST /api/documents/upload` is multipart:

```
File ─► size + type check ─► mammoth / marked / wrap ─► HTML
                                                         │
                                  jsdom polyfill ──────► │
                                                         ▼
                                            @tiptap/html generateJSON
                                                         │
                                                         ▼
                                            Prisma create Document
```

jsdom is loaded lazily on the first import so the cold path on every other
route is unaffected. The route is forced to the Node runtime so mammoth's
buffer parsing works.

## Tradeoffs I made consciously

- **Single "collaborator" role** instead of viewer/editor distinction. Cuts
  the role plumbing in three layers (DB, server check, UI gating). Documented
  as a deliberate cut.
- **Last-write-wins** instead of operational transform or CRDT. Real-time
  conflict resolution is a multi-day project, not a 4-hour add-on.
- **No image upload inside docs.** TipTap supports it, but it would have
  pulled in object storage (S3 or Vercel Blob) for a feature the brief
  doesn't require.
- **Postgres-only (no SQLite).** Originally tempted to ship SQLite for
  zero-friction local dev, but Vercel's filesystem is ephemeral. Single
  source of truth beats a dual-provider Prisma schema.
- **Server-rendered first paint on lists.** Skipped TanStack Query in favor
  of server components for the doc list. Saved ~20 minutes and the list
  isn't interactive enough to justify a client-side cache.
- **One integration test, not many.** The sharing flow is the highest-risk,
  least-obvious logic. Editor-toolbar unit tests would mostly test TipTap.

## File / module boundaries

Library code lives in `src/lib/`:

- `auth.ts` — NextAuth setup + the `auth()` helper used everywhere
- `prisma.ts` — singleton Prisma client (avoids the dev-mode connection storm)
- `api.ts` — request helpers (`requireUser`, `loadAccessibleDocument`,
  `HttpError`, `handleError`). All route files use these — none of them call
  `auth()` directly.
- `schemas.ts` — zod schemas for request bodies
- `import-file.ts` — file → TipTap JSON, with the jsdom polyfill
- `format.ts` — relative date strings

Each file has one clearly-named purpose. No file is over ~140 lines.
