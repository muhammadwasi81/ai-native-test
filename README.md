# Ajaia Docs — Lightweight Collaborative Document Editor

A small full-stack take-home built for the Ajaia LLC AI-Native Full Stack
Developer assignment. Documents you can create, edit (rich text), upload from
`.txt` / `.md` / `.docx`, and share with another user.

**Live URL:** **https://ai-native-test.vercel.app**
**Source:** **https://github.com/muhammadwasi81/ai-native-test**

## Stack at a glance

- **Next.js 14** App Router (TypeScript) — both UI and API in one repo
- **TipTap** for rich-text editing (ProseMirror under the hood)
- **Prisma** ORM → **Postgres** (Neon in prod, local Docker in dev)
- **NextAuth v5** with Credentials provider, JWT sessions
- **Tailwind CSS** for styling, **react-hot-toast** for notifications
- **mammoth.js + marked + jsdom** for file imports → TipTap JSON
- **Vitest** for the integration test
- Deployed to **Vercel**

## Demo accounts

Seeded by `prisma/seed.ts`. Password for all three: `demo1234`.

| Email              | Name             |
| ------------------ | ---------------- |
| `alice@demo.test`  | Alice Alvarez    |
| `bob@demo.test`    | Bob Brennan      |
| `carol@demo.test`  | Carol Chen       |

A "Welcome to your editor" document is seeded under Alice and shared with Bob,
so the sharing flow is visible the moment you log in.

## Run locally

### 1. Prerequisites

- Node 18+ (tested on 24)
- pnpm 9+
- Docker (for local Postgres) — _or any Postgres URL you already have_

### 2. Clone and install

```bash
git clone <this-repo>
cd ai-job-task
pnpm install
```

### 3. Start Postgres + apply schema + seed

```bash
docker compose up -d                 # Postgres on localhost:5433
cp .env.example .env                 # already-correct defaults
pnpm exec prisma migrate dev         # apply schema
pnpm db:seed                         # create demo users + welcome doc
```

> Already have Postgres on 5432? Change `DATABASE_URL` in `.env` to point at
> it, then skip `docker compose`.

### 4. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3010](http://localhost:3010). You'll be sent to `/login`.

### 5. Run the test

```bash
pnpm test
```

Hits the route handlers against the dev DB and exercises the full sharing
authorization flow.

## What's implemented

**Document creation and editing**
- Create a blank document
- Rename inline (saved on blur)
- Edit with rich-text formatting: **bold**, *italic*, <u>underline</u>,
  H1 / H2 / H3, bulleted and numbered lists, undo / redo
- Debounced autosave (800 ms) with a visible Saving / Saved / Error pill

**File upload**
- Upload `.txt`, `.md`, or `.docx` from the documents page
- Server parses to HTML (mammoth for `.docx`, marked for `.md`, plain wrap for
  `.txt`) and converts to TipTap JSON via `@tiptap/html` with a jsdom polyfill
- 5 MB cap; unsupported types rejected with a toast
- Uploaded file becomes a new editable document immediately

**Sharing**
- The document owner can share by email from inside the editor
- A single "collaborator" role: anyone shared with can view _and_ edit
- Documents page splits **My documents** vs **Shared with me** with the
  owner's name on shared docs
- Owner can revoke access at any time

**Persistence**
- Postgres via Prisma. Documents survive refresh; sharing state is durable.
- Production migrations run automatically on Vercel's build step.

**Quality**
- All API bodies validated with zod
- Consistent HTTP error mapping (400 / 401 / 403 / 404 / 413 / 415 / 409)
- One Vitest integration test exercising the sharing flow end-to-end (4 cases)

## Architecture note

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the design decisions and the
tradeoffs I deliberately made under the timebox.

## AI workflow note

See [AI_WORKFLOW.md](./AI_WORKFLOW.md).

## Explicitly out of scope

To stay focused inside the timebox, I cut these on purpose. Each is a real
stretch goal but adds risk I didn't want to take on:

- **Real-time collaborative cursors** (would require Yjs / a WebSocket layer)
- **Comments / suggestions mode**
- **Document version history**
- **Role-based permissions** beyond a single "collaborator" role
- **OAuth providers** (credentials login is enough to demonstrate sharing)
- **Image uploads inside documents**

## What I'd build next with another 2–4 hours

1. **Viewer vs editor roles** — `Share.role` enum, gated PATCH on the server,
   editor is read-only when the role is viewer. Small change, big product
   feel.
2. **Markdown export** of any document — straight ProseMirror→Markdown via
   the `prosemirror-markdown` package.
3. **Last-edited-by indicator** — write the editing user ID into the doc on
   save and show it next to "All changes saved".
4. **A second test pass** — a Playwright happy-path E2E. The existing Vitest
   integration test pins the authorization model, but a UI test would catch
   regressions in the editor wiring.

## Project layout

```
src/
├── app/
│   ├── (app)/                    # authenticated layout group
│   │   ├── layout.tsx            # adds header, guards via auth()
│   │   └── documents/
│   │       ├── page.tsx          # list (Owned / Shared sections)
│   │       └── [id]/
│   │           ├── page.tsx      # editor entry; loads doc server-side
│   │           ├── document-editor.tsx
│   │           ├── editor-toolbar.tsx
│   │           └── share-dialog.tsx
│   ├── login/                    # public login page
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth handlers
│   │   └── documents/
│   │       ├── route.ts          # GET (list), POST (create)
│   │       ├── upload/route.ts   # POST multipart upload
│   │       └── [id]/
│   │           ├── route.ts      # GET / PATCH / DELETE
│   │           └── shares/
│   │               ├── route.ts            # GET / POST
│   │               └── [userId]/route.ts   # DELETE
│   └── layout.tsx, page.tsx, globals.css
├── components/
│   └── app-header.tsx
├── lib/
│   ├── auth.ts                   # NextAuth config + auth() helper
│   ├── prisma.ts                 # Prisma client singleton
│   ├── api.ts                    # requireUser, loadAccessibleDocument, error mapper
│   ├── schemas.ts                # zod request schemas
│   ├── import-file.ts            # txt/md/docx → TipTap JSON
│   └── format.ts                 # relative date formatter
└── middleware.ts                 # redirects unauthenticated requests to /login

prisma/
├── schema.prisma                 # User, Document, Share
├── seed.ts                       # 3 demo users + 1 shared welcome doc
└── migrations/

tests/
├── helpers.ts                    # reset DB, mocked session, request helpers
└── sharing.test.ts               # the integration test
```
