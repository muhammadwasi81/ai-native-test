# Ajaia LLC — AI-Native Full Stack Developer Submission

**Candidate:** Muhammad Wasi · `wasiarain819@gmail.com`

## Quick links

| Item                 | URL                                                  |
| -------------------- | ---------------------------------------------------- |
| Live deployed app    | https://ai-native-test.vercel.app                    |
| Source repository    | https://github.com/muhammadwasi81/ai-native-test     |
| Walkthrough video    | _see the "Video Submission Link" field on this form_ |

## Demo accounts (seeded in production)

| Email              | Name           | Password    | Notes                                          |
| ------------------ | -------------- | ----------- | ---------------------------------------------- |
| `alice@demo.test`  | Alice Alvarez  | `demo1234`  | Owns the "Welcome to your editor" doc          |
| `bob@demo.test`    | Bob Brennan    | `demo1234`  | Has access to Alice's welcome doc via a share  |
| `carol@demo.test`  | Carol Chen     | `demo1234`  | No shared docs — use to demonstrate access denial |

## Five-minute review path

1. Open https://ai-native-test.vercel.app — you're redirected to `/login`.
2. Log in as **Alice** (`alice@demo.test` / `demo1234`).
3. The documents page shows **My documents (1)** with "Welcome to your editor".
4. Open it. Try the toolbar: **B / I / U / H1–H3 / • / 1. / undo / redo**. Watch the **Saving → Saved** pill in the top right after each change.
5. Click **Share** — Bob is already listed. Add `carol@demo.test`. Click **Add**.
6. Sign out, sign in as **Carol**. The welcome doc now appears under **Shared with me** with the "Owned by Alice Alvarez" subtitle.
7. Sign out, sign in as **Bob**. Click **Upload file**, pick any `.md` / `.docx` / `.txt` — the doc opens immediately with formatting preserved.
8. From the same browser tab, hit `https://ai-native-test.vercel.app/documents/<id>` for a doc you have no share on — server returns 403 / page returns not-found.

## What the brief asked for, and where it lives

| Requirement                                  | Where it's implemented                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Create, rename, edit, save, reopen docs       | `src/app/(app)/documents/[id]/document-editor.tsx` + `PATCH /api/documents/:id`                          |
| Rich text (B / I / U / headings / lists)     | TipTap StarterKit + Underline extension; toolbar at `editor-toolbar.tsx`                                 |
| File upload (txt / md / docx → editable doc) | `src/app/api/documents/upload/route.ts` + `src/lib/import-file.ts` (mammoth + marked + jsdom + TipTap)   |
| Sharing (owner + add user + revoke)          | `src/app/api/documents/[id]/shares/**` + `share-dialog.tsx`                                              |
| Owned vs shared visible distinction          | `documents-list.tsx` splits into "My documents" and "Shared with me" with the owner name on shared docs  |
| Persistence (survives refresh)               | Prisma + Postgres (Neon in prod, Docker locally). Single source of truth.                                |
| Setup + run instructions                     | `README.md` in the repo — two commands to get running locally                                            |
| Live deployment                              | https://ai-native-test.vercel.app                                                                       |
| Validation + error handling                  | zod on every server body; consistent HTTP error mapping in `src/lib/api.ts`                              |
| At least one meaningful automated test       | `tests/sharing.test.ts` — 4 assertions exercising the full sharing authorization flow                    |
| Architecture note                            | `ARCHITECTURE.md` in the repo (also summarized below)                                                    |

## Stack at a glance

- **Framework:** Next.js 14 App Router (TypeScript) — UI + API in one repo
- **Editor:** TipTap (ProseMirror semantics) with StarterKit + Underline
- **Persistence:** Prisma ORM → Postgres (Neon in prod, Docker locally)
- **Auth:** NextAuth v5 Credentials provider, JWT in httpOnly cookie
- **Styling:** Tailwind CSS; **toasts:** react-hot-toast
- **File import:** mammoth.js (`.docx`) + marked (`.md`) + jsdom polyfill + `@tiptap/html` `generateJSON`
- **Tests:** Vitest hitting the route handlers against a real Postgres
- **Deploy:** Vercel; build runs `prisma generate && prisma migrate deploy && next build` so schema applies on every deploy

## Architecture decisions (and what I cut)

### Optimized for

1. **One deployable artifact.** A single Next.js app means one repo, one deploy, one set of env vars. I would have lost an hour on a separate API service for no demonstrable gain.
2. **Demonstrable end-to-end correctness.** Real users, real DB, real cascading deletes — not in-memory state.
3. **Reviewer ergonomics.** Seeded users, a pre-shared welcome doc, a deploy URL. Local setup is `docker compose up && pnpm dev`.

### Sharing model

Single role: anyone in the `Share` table is a **collaborator** (read + edit). This is a deliberate cut from the obvious viewer/editor split. The brief asks for "clear intent and working logic", not a full RBAC system. The cut is documented in the README and listed as the first thing I'd add with more time.

### Authorization

Two checks live in `src/lib/api.ts`:

- `requireUser()` — pulls the session and 401s if missing
- `loadAccessibleDocument(id, userId, { requireOwner? })` — loads the doc or throws `HttpError(404)` / `HttpError(403)`

Every documents/shares route uses these. The integration test verifies that:

- Owner can CRUD their docs
- Recipient can read + edit but cannot manage shares
- Non-collaborator gets 403
- Revoked share immediately removes access
- Unauthenticated request gets 401
- Sharing with a non-existent email gets 404
- Non-owner cannot list shares

### File upload pipeline

```
File ─► size + extension check ─► mammoth / marked / plain-wrap ─► HTML
                                                                    │
                                            jsdom polyfill ──────► │
                                                                    ▼
                                                @tiptap/html generateJSON
                                                                    │
                                                                    ▼
                                                Prisma create Document
```

jsdom is loaded lazily inside the upload handler so the cold path on every other route is unaffected. The route is forced to the Node runtime so mammoth's buffer parsing works on Vercel.

### Autosave

`onUpdate` from TipTap schedules a `PATCH` on a 800 ms trailing debounce. A small pill shows **Saving / Saved / Error** so the user is never surprised. Title saves on blur. Conflict policy is **last-write-wins** — documented because it'd be the first concern in a real-time follow-up.

### Database choice

Postgres-only via Prisma — SQLite would have been zero-friction for local dev, but Vercel's filesystem is ephemeral so prod SQLite is not viable. One provider is simpler than dual-provider with switching at build time.

## Tradeoffs I made consciously

| Cut                                       | Why                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Real-time collaborative cursors (Yjs)     | Multi-day project. Out of scope for 4–6 hours.                                                   |
| Comments / suggestions                    | Out of scope                                                                                     |
| Document version history                  | Out of scope                                                                                     |
| Viewer-vs-editor role distinction         | Single "collaborator" role satisfies the brief; full role plumbing in 3 layers is not worth it.   |
| OAuth providers                           | Credentials login is enough to demonstrate sharing. OAuth adds setup time, not insight.           |
| Image uploads inside documents            | Would require object storage (S3 / Vercel Blob) and isn't asked for.                              |
| Pixel-perfect mobile layout               | Usable on mobile, but not polished. Desktop-first.                                                |

## What I'd build next with another 2–4 hours

1. **Viewer vs editor roles** — `Share.role` enum, gate `PATCH` on the server, render editor read-only when role is viewer. Small change, big product feel.
2. **Markdown export** of any doc via `prosemirror-markdown`.
3. **"Last edited by" indicator** next to the autosave pill.
4. **Playwright E2E** for the full owner → share → recipient flow in a real browser. The existing Vitest test pins the authorization model, but a UI test would catch editor-wiring regressions.

## Tests

Run `pnpm test`. One file, four assertions:

```
tests/sharing.test.ts
  ✓ owner creates, shares, recipient reads + edits, third party is forbidden, revoke removes access
  ✓ rejects sharing with a non-existent email
  ✓ only the owner may add or list shares
  ✓ unauthenticated requests are 401
```

The test mocks `auth()` to switch between users and hits the **real route handlers** with **real Prisma against a real Postgres**, exercising cascading deletes and the unique index. This is the highest-risk piece of logic — anything that goes wrong here is invisible to the user but catastrophic.

## AI workflow

### Tools used

- **Claude Code (Opus 4.7)** as the primary AI pair. It orchestrated brainstorming → spec → implementation, scaffolded boilerplate in parallel, ran tests and typecheck, and drove the Chrome DevTools MCP for the in-browser smoke test.
- **Library docs** (TipTap, NextAuth v5, Prisma, mammoth, marked) consulted directly. I verified API surfaces against the docs rather than trusting AI memory because these libraries shift between versions.

### Where AI materially sped up the work

| Task                                                | What AI did                                                                                                       | Saved (est.) |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------ |
| Project scaffold (package.json, configs, base files) | Generated coherent versions of `tsconfig`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, etc.    | ~25 min      |
| Prisma schema + seed                                 | Wrote the three-model schema and a seed with the welcome doc as proper TipTap JSON in one pass.                   | ~15 min      |
| API route handlers                                   | Drafted seven route handlers with consistent error mapping and zod validation. I shaped the contract; AI filled it. | ~30 min      |
| TipTap editor + toolbar                              | Generated the toolbar buttons, debounced autosave, and status pill.                                               | ~25 min      |
| Documents list UI                                    | Translated the design (two sections, card grid, upload + new buttons) into Tailwind components.                   | ~15 min      |
| Vitest integration test                              | Generated the test scaffolding and assertions matching the authorization model I described.                       | ~15 min      |

Net: AI compressed roughly two hours of mechanical work into ~40 minutes. The remaining time went to product judgment, debugging, and verification.

### What I changed or rejected

- **Rejected a SQLite-then-Postgres dual-schema setup.** AI's first instinct was to ship SQLite for local dev with provider-switching at build time. I overruled — single Postgres provider with Docker locally is cleaner and avoids `Json`-column behavioral differences.
- **Rejected `serverComponentsExternalPackages: ['jsdom']`.** First attempt added jsdom to externals; I noticed I'd loaded jsdom lazily inside the upload handler instead, which is enough and avoids broader externalization.
- **Rejected viewer/editor role plumbing as a first cut.** AI proposed a `role` enum on `Share`. I cut it because the brief doesn't demand RBAC — single collaborator role is enough. Documented as a deliberate cut.
- **Rewrote autosave error UX.** Initial version silently retried on failure. I made it surface a toast and a red status pill — a real user losing edits is the worst case.
- **Tightened `loadAccessibleDocument`.** First version had a TOCTOU window between the access check and the update. I tightened it so the check runs in the same request as the mutation, and `requireOwner` short-circuits before any data is touched.
- **Scoped the test cleanup.** Initial test reset wiped *all* users. I changed it to delete only `@test.local` users so running `pnpm test` doesn't blow away the seeded demo accounts.

### How I verified correctness

- **TypeScript strict mode** clean (`pnpm exec tsc --noEmit`).
- **Vitest integration test** covers the authorization invariants. Runs against the dev Postgres so it exercises real Prisma + real cascades.
- **Manual API smoke tests via curl** during development — login, list, upload with a real `.md` file, share, switch user, confirm 403.
- **Browser smoke test via Chrome DevTools MCP** — confirmed login, document list rendering, editor mounting with formatting marks preserved, share dialog opening with seeded collaborator. Screenshots in `docs/screenshots/`.
- **Production smoke test** post-deploy — confirmed live login + documents page on `https://ai-native-test.vercel.app`.

### Practical note on AI reliability

I leaned on AI most heavily where the wrong answer is cheap to detect (typecheck failures, failing tests, 4xx responses). Where the failure mode is "runs fine but is subtly wrong" — authorization, autosave conflict policy, the order of cascade deletes — I slowed down and verified by hand.

## Local setup (in ~90 seconds)

```bash
git clone https://github.com/muhammadwasi81/ai-native-test
cd ai-native-test
pnpm install
docker compose up -d                  # Postgres on localhost:5433
cp .env.example .env                  # defaults are correct
pnpm exec prisma migrate dev
pnpm db:seed
pnpm dev
# open http://localhost:3010
```

Run the test:

```bash
pnpm test
```

## Project layout

```
src/
├── app/
│   ├── (app)/                          # authenticated route group
│   │   ├── layout.tsx                  # adds header, guards via auth()
│   │   └── documents/
│   │       ├── page.tsx                # list page (server-rendered, splits Owned / Shared)
│   │       ├── documents-list.tsx
│   │       └── [id]/
│   │           ├── page.tsx            # editor entry; access check + load
│   │           ├── document-editor.tsx # TipTap editor + autosave + share button
│   │           ├── editor-toolbar.tsx  # B / I / U / H1-3 / UL / OL / undo / redo
│   │           └── share-dialog.tsx    # add-by-email + revoke
│   ├── login/                          # public login page
│   ├── api/
│   │   ├── auth/[...nextauth]/         # NextAuth handlers
│   │   └── documents/
│   │       ├── route.ts                # GET (list), POST (create)
│   │       ├── upload/route.ts         # POST multipart upload
│   │       └── [id]/
│   │           ├── route.ts            # GET / PATCH / DELETE
│   │           └── shares/
│   │               ├── route.ts        # GET / POST
│   │               └── [userId]/route.ts  # DELETE
│   ├── layout.tsx, page.tsx, globals.css
│   └── providers.tsx                   # SessionProvider for client components
├── components/
│   └── app-header.tsx
├── lib/
│   ├── auth.ts                         # NextAuth config + auth() helper
│   ├── prisma.ts                       # Prisma client singleton
│   ├── api.ts                          # requireUser, loadAccessibleDocument, error mapper
│   ├── schemas.ts                      # zod request schemas
│   ├── import-file.ts                  # txt / md / docx → TipTap JSON (with jsdom polyfill)
│   └── format.ts                       # relative date formatter
└── middleware.ts                       # redirects unauthenticated requests

prisma/
├── schema.prisma                       # User, Document, Share
├── seed.ts                             # 3 demo users + 1 shared welcome doc
└── migrations/

tests/
├── helpers.ts                          # mocked session, reset DB scoped to @test.local
└── sharing.test.ts                     # the integration test (4 assertions)

docs/
├── screenshots/                        # login, list, editor, share-dialog
└── superpowers/specs/2026-05-21-collab-doc-editor-design.md  # original design spec

samples/
├── product-brief.md                    # Markdown sample for upload demo
├── meeting-notes.docx                  # Word sample for upload demo
└── release-notes.txt                   # Plain-text sample for upload demo
```

## What I would emphasize in a review

- The integration test pins the **most critical and least-obvious** invariant in the app (cross-user authorization with cascade revocation).
- The "Shared with me" section + "Owned by X" subtitle are small UX touches that demonstrate I read the brief, not just executed it.
- The scope cuts are explicit, named, and have a documented next-step. The cuts are the work product.
- The AI usage is intentional: I drove the design, AI accelerated the boilerplate, and I verified the parts that AI cannot reliably get right.

## Walkthrough video

Recorded separately and linked in the **Video Submission Link** field above. It covers:

- 0:00 — Live URL and stack overview
- 0:30 — Log in as Alice, tour documents page, open welcome doc, format text, autosave indicator
- 1:30 — Share dialog: add Carol → sign out → sign in as Carol → see "Shared with me"
- 2:30 — Sign in as Bob → upload `samples/product-brief.md` → formatting preserved
- 3:30 — Run `pnpm test` locally, four assertions pass
- 4:00 — Walk through the scope cuts and what I'd build next
