# AI Workflow Note

How I actually used AI on this assignment.

## Tools used

- **Claude Code (Opus 4.7)** — primary AI pair: orchestrated the
  brainstorming → spec → implementation flow, wrote most of the boilerplate
  in parallel tool calls, and ran tests / typecheck.
- **TipTap + mammoth + marked official docs** — consulted directly. AI was
  good at scaffolding the integration but I verified each library's actual
  API against its docs because the surface area shifts between versions.

## Where AI materially sped up the work

| Task                                                     | What AI did                                                                                                                          | Time saved (est.) |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| Project scaffold (package.json, configs, layout)         | Generated coherent versions of `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `.gitignore`, etc.    | ~25 min           |
| Prisma schema + seed                                     | Wrote the three-model schema and a seed with the welcome doc as proper TipTap JSON in one pass.                                      | ~15 min           |
| API route handlers                                       | Drafted seven route handlers with consistent error mapping and zod validation. I shaped the contract; the AI filled it in.            | ~30 min           |
| TipTap editor + toolbar                                  | Generated the toolbar buttons, debounced autosave, and status pill from a short description.                                          | ~25 min           |
| Documents list UI                                        | Translated the design (two sections, card grid, upload + new buttons) into Tailwind components.                                      | ~15 min           |
| Vitest integration test                                  | Generated the test scaffolding and the four assertions matching the authorization model I described.                                  | ~15 min           |

Net: AI compressed roughly 2 hours of mechanical work into ~40 minutes. The
remaining time went to product judgment, debugging, and verification.

## What I changed or rejected

- **Rejected an SQLite-then-Postgres dual-schema approach.** AI's first
  instinct was to ship SQLite for local dev with provider-switching at build
  time. I overruled — single Postgres provider with Docker locally is far
  cleaner and avoids a class of `Json`-column behavioral differences.
- **Rejected `serverComponentsExternalPackages: ['jsdom']`.** First attempt
  added jsdom to externals; I noticed I'd loaded jsdom lazily inside the
  upload handler instead, which is enough and avoids broader externalization.
- **Rejected viewer/editor role plumbing as a first cut.** AI initially
  proposed a `role` enum on `Share`. I cut it because the brief explicitly
  asks for "clear intent and working logic" — single collaborator role
  satisfies it. Documented as a deliberate cut and as a follow-up.
- **Rewrote autosave error UX.** Initial version silently retried on failure.
  I made it surface a toast and a red status pill so the user knows. A real
  user losing edits is the worst case.
- **Tightened `loadAccessibleDocument`.** First version had a TOCTOU between
  the access check and the update. I tightened it so the check runs in the
  same request as the mutation, and `requireOwner` short-circuits before any
  data is touched.

## How I verified correctness

- **TypeScript strict mode** clean — `pnpm exec tsc --noEmit` is part of the
  check loop.
- **Vitest integration test** covers the authorization invariants. It runs
  against the dev Postgres so it exercises real Prisma + real cascades.
- **Manual API smoke tests via curl** during development — POST to login,
  GET docs, POST upload with a real `.md` file, POST shares with another
  email, GET as the recipient, and confirmed the third user gets 403. This
  caught one bug where the share endpoint returned the wrong status when the
  target user didn't exist.
- **End-to-end UX walkthrough** before declaring done: log in as Alice,
  create + rename + format a doc, upload a `.md` file, share with Bob, sign
  out, sign in as Bob, see it in "Shared with me", edit, sign in as Carol,
  confirm it's not visible.

## What AI is not credited for

- The product decisions: single-collaborator role, last-write-wins, no real-
  time. Those are scope cuts I made.
- The data model. The schema is small enough that designing it took less
  time than describing it to AI would have.
- The integration test's _coverage selection_. AI wrote the assertions; I
  chose what to assert: that revoke is immediate, that listing shares is
  owner-only, that 404 vs 403 are returned correctly.

## Practical note on tool reliability

I leaned on AI most heavily where the wrong answer is cheap to detect:
typecheck failures, failing tests, 4xx responses. Where the failure mode is
"runs fine but is subtly wrong" (authorization, autosave conflict policy), I
slowed down and verified by hand.
