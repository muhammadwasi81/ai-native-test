# Submission

**Candidate:** Muhammad Wasi · wasiarain819@gmail.com
**Assignment:** Ajaia LLC — AI-Native Full Stack Developer

## Live links

| Item                  | URL                                                          |
| --------------------- | ------------------------------------------------------------ |
| Live deployed app     | https://ai-native-test.vercel.app                            |
| Walkthrough video     | _filled in after recording — paste your Loom / YouTube link_ |
| Source repository     | https://github.com/muhammadwasi81/ai-native-test             |

## Demo credentials

Three seeded users, all with password `demo1234`:

- `alice@demo.test` (owns the Welcome doc, has shared with Bob)
- `bob@demo.test`   (has a doc shared from Alice)
- `carol@demo.test` (no shared docs — use to demonstrate access denial)

## What's included in this folder

| File                                                              | Purpose                                              |
| ----------------------------------------------------------------- | ---------------------------------------------------- |
| `README.md`                                                       | Local setup, demo accounts, feature list, scope cuts |
| `ARCHITECTURE.md`                                                 | Design narrative and tradeoffs                       |
| `AI_WORKFLOW.md`                                                  | AI tools used, what they sped up, what was rejected  |
| `SUBMISSION.md`                                                   | This file                                            |
| `docs/superpowers/specs/2026-05-21-collab-doc-editor-design.md`   | Original design spec                                 |
| `src/`                                                            | Source code (Next.js 14 app + API routes)            |
| `prisma/schema.prisma`, `prisma/seed.ts`, `prisma/migrations/`    | DB schema, seed, migration history                   |
| `tests/`                                                          | Vitest integration test for sharing flow             |
| `docker-compose.yml`                                              | Local Postgres for dev / test                        |
| `.env.example`                                                    | Env var template                                     |
| `package.json`, `pnpm-lock.yaml`                                  | Dependencies (pnpm)                                  |

## What works end-to-end

- Login as Alice → see "Welcome to your editor" under "My documents"
- Create a new blank doc → rename it → format with bold / italic / underline /
  H1–H3 / bullet + numbered lists → see autosave indicator confirm
- Upload `.txt`, `.md`, or `.docx` → new editable doc appears with content
  preserved (headings, lists, basic marks)
- From inside a doc, **Share** → add `bob@demo.test` → close
- Sign out, sign in as Bob → see "Welcome to your editor" under
  "Shared with me", owned by Alice → open, edit, save
- Sign in as Carol → confirm she does not see the doc and direct URL
  returns a 404 (server returns 403; UI normalizes to not-found)
- Owner can revoke → revoked user loses access on next load
- `pnpm test` → 4 passing integration assertions

## What's partial or incomplete

Nothing functional is partial. The intentional scope cuts (documented in
`README.md` under "Explicitly out of scope") are:

- Real-time collaborative cursors
- Comments / suggestions
- Document version history
- Viewer-vs-editor role distinction (single "collaborator" role only)
- OAuth providers (credentials-based sign-in only)
- Image uploads inside documents
- Pixel-perfect mobile layout (it's usable, not polished)

## What I'd build next with 2–4 more hours

1. **Viewer vs editor roles.** Add `role` to `Share`, gate `PATCH` on
   server, render editor read-only when viewer.
2. **Markdown export** of any doc via `prosemirror-markdown`.
3. **"Last edited by" indicator** next to the autosave pill.
4. **Playwright E2E** for the full owner→share→recipient flow in a real
   browser.

## Running locally

See `README.md`. Two commands and you're in:

```bash
docker compose up -d && pnpm install && pnpm exec prisma migrate dev && pnpm db:seed
pnpm dev
```

## Running the test

```bash
pnpm test
```

Hits the route handlers directly against the dev Postgres. 4 assertions
covering create, share, recipient read+edit, third-party denial, and revoke.
