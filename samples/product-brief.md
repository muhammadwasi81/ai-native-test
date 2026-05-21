# Q3 Product Brief — Project Lumen

## Overview

Project **Lumen** is a lightweight initiative to help small teams *capture*,
*organize*, and *share* written knowledge with as little friction as possible.
The goal is a tool people open in the first 30 seconds of a working session
and never have to think about again.

## Goals for Q3

1. Ship a usable rich-text editor with the core formatting primitives
2. Allow file import from common formats so existing notes can move in
3. Demonstrate a working sharing model between team members
4. Reach a baseline of trust through honest engineering quality

## Non-goals

- Real-time collaborative cursors (deferred to Q4)
- Comments and suggestions
- Public link sharing outside the team
- Mobile app

## Success metrics

- Time-to-first-document under 60 seconds for a new user
- 80% of users who create one document create a second within a week
- Zero P0 incidents during the rollout window

## Risks

- Editor library churn (we're betting on TipTap)
- Permission model creep — must resist adding viewer/editor roles before the
  basic share model proves itself
- Storage cost if document size grows unbounded

## Team

- Engineering lead, two engineers, one designer, one PM
- Weekly demo every Thursday at 10am

## Timeline

| Week | Milestone                             |
| ---- | ------------------------------------- |
| 1    | Skeleton: auth, list, blank editor    |
| 2    | Rich-text formatting + autosave       |
| 3    | File import (txt / md / docx)         |
| 4    | Sharing flow + deploy                 |
| 5    | Polish, docs, beta with 5 friendly teams |

## Open questions

- Do we need to differentiate viewer vs editor roles in v1?
- Should we ship Markdown export alongside import?
- What's the right cap on file upload size?

---

*This is a sample document for testing file upload. Drop it into the editor to
confirm headings, lists, emphasis, and tables are preserved.*
