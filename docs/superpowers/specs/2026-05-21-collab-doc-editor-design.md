# Collaborative Document Editor — Design Spec

**Date:** 2026-05-21
**Author:** Muhammad Wasi
**Context:** Ajaia LLC AI-Native Full Stack Developer take-home (4–6 h timebox)

## Goal

Ship a lightweight Google-Docs-style editor that demonstrates product judgment
across creation, editing, file import, sharing, and deployment — within the
timebox, with deliberate scope cuts.

## Stack

- **Framework:** Next.js 14 App Router (TypeScript)
- **Editor:** TipTap (ProseMirror) with `StarterKit` + `Underline` extensions
- **Persistence:** Prisma — SQLite locally, Neon Postgres in production
- **Auth:** NextAuth v5 (Credentials provider) on JWT/httpOnly cookies
- **Validation:** zod on every server body
- **Testing:** Vitest (one integration test)
- **Deploy:** Vercel (build runs `prisma migrate deploy`)

## Data model

```prisma
User      { id, email @unique, name, passwordHash, createdAt }
Document  { id, title, content Json, ownerId -> User, createdAt, updatedAt }
Share     { id, documentId -> Document, userId -> User, createdAt
            @@unique([documentId, userId]) }
```

Seed: alice@demo.test, bob@demo.test, carol@demo.test — password `demo1234`.

## Sharing model

Single role: any user with a `Share` row is a **collaborator** (read + edit).
This is a deliberate MVP simplification, called out in the README. The brief's
requirement of a "visible distinction between owned and shared documents" is
satisfied by:

- Two sidebar sections — **My Documents** vs **Shared with Me**
- "Owned by <name>" subtitle on shared docs in the editor header
- Share dialog only available to the owner

## API

| Method | Path                                       | Auth        | Notes                          |
| ------ | ------------------------------------------ | ----------- | ------------------------------ |
| POST   | `/api/auth/[...nextauth]`                  | —           | NextAuth                       |
| GET    | `/api/documents`                           | session     | `{ owned: [], shared: [] }`    |
| POST   | `/api/documents`                           | session     | Create blank                   |
| POST   | `/api/documents/upload`                    | session     | `.txt/.md/.docx` → new doc     |
| GET    | `/api/documents/:id`                       | owner/share | 403 if no access               |
| PATCH  | `/api/documents/:id`                       | owner/share | Title and/or content           |
| DELETE | `/api/documents/:id`                       | owner       |                                |
| GET    | `/api/documents/:id/shares`                | owner       |                                |
| POST   | `/api/documents/:id/shares`                | owner       | Body `{ email }`, must exist   |
| DELETE | `/api/documents/:id/shares/:userId`        | owner       |                                |

Error mapping: 400 (zod), 401 (no session), 403 (no access), 404 (not found).

## File import

- `.txt` → wrap in `<p>` per line
- `.md`  → `marked()` → HTML
- `.docx` → `mammoth.convertToHtml({ buffer })`
- HTML fed into TipTap via `generateJSON(html, [StarterKit, Underline])`,
  stored as JSON in `Document.content`
- 5 MB cap; other types rejected with a toast

## UI

- `/login` — email + password, hint listing seeded accounts
- `/documents` — sidebar with two groups, top bar (New / Upload), recent list
- `/documents/[id]` — title input (save on blur), TipTap with toolbar
  (B / I / U / H1 / H2 / H3 / • / 1.), debounced autosave (800 ms) with status
  pill (Saving / Saved / Error), Share button → dialog (owner only)

## Persistence and autosave

`onUpdate` from TipTap → 800 ms debounce → `PATCH /api/documents/:id`. Status
pill reflects pending / success / error. Last-write-wins conflict policy
(documented).

## Tests

One Vitest integration test calling the route handlers against a SQLite test
DB (file-based, reset per run via `prisma migrate reset`):

1. Alice creates a doc → 201
2. Alice shares with Bob by email → 201
3. Bob `GET /api/documents` → doc appears in `shared[]`
4. Bob `PATCH` content → 200
5. Carol `GET /api/documents/:id` → 403
6. Alice revokes Bob → Bob's next `GET` → 403

This is the **highest-risk authorization logic** and the test most likely to
catch a real regression.

## Deliverables

- `README.md` — setup, run, env, seeded creds, deployment URL
- `ARCHITECTURE.md` — decisions and tradeoffs (this doc condensed)
- `AI_WORKFLOW.md` — tools used, accelerations, rejections, verification
- `SUBMISSION.md` — file checklist + links
- `.env.example`
- Prisma schema + seed
- One Vitest integration test
- Live Vercel URL recorded in README and SUBMISSION

## Explicit non-goals

Called out in README under "Out of scope":

- Real-time collaborative cursors (no Yjs / sockets)
- Comments / suggestions mode
- Version history
- Role-based permissions (viewer vs editor)
- OAuth / SSO
- Image uploads inside documents
- Pixel-perfect mobile design

## Time budget (≈ 235 min remaining)

| Phase                              | Minutes |
| ---------------------------------- | ------- |
| Scaffold + auth + Prisma + seed    | 45      |
| Editor + autosave                  | 45      |
| Upload pipeline                    | 30      |
| Sharing API + UI                   | 45      |
| Integration test + docs            | 30      |
| Deploy (Vercel + Neon)             | 20      |
| Polish / buffer                    | 20      |
