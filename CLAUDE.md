# BrowCivVI

BrowCivVI is a browser, turn-based, 4X-_lite_ strategy game themed on Civ 6's "Conquests of Alexander" scenario. It is also an educational journey: it teaches the history of Alexander's campaigns through play, and it is a vehicle for the author to brush up on their frontend skills. The author is still learning React and struggles with CSS.

The authoritative design lives in [`docs/design.md`](docs/design.md). Read it before starting work — it fixes the architecture (server-authoritative, pure rules engine, content-as-data) and the data model so changes stay additive.

## Game Domain Context

- Terms like **Royal Road**, **Immortals**, **Hetairoi**, **Hypaspists**, **phalangites / sarissa**, **hoplites**, **satrapy**, **flanking**, **great general**, **divergence node**, and **hex** refer to **in-game / historical mechanics**, not GitHub/repo concepts. Before acting on an ambiguous term, restate in one line what it covers and flag anything that could be a game concept vs. a tooling concept.
- When implementing historical or Civ-derived features, match **authentic history and authentic Civ 6 effects** — do not invent placeholder mechanics. Reference `docs/design.md` (and its citations), the Civ 6 wiki, or ask the user if unsure.
- **Accurate start, divergent play** (design §10): the authored baseline — the **334 BC opening at the Granicus**, map, geography, and content — must be historically exact; emergent play may then diverge. Geography is enforced; dates are surfaced for flavor, not hard gates.

## Design & UX questions

The author is still learning frontend and relies on Claude to surface design decisions early. Front-load discovery before writing UI code.

- Before starting any new task that touches UI, layout, visuals, interaction, or UX (the hex board, unit/city rendering, combat feedback, media cards, leaderboards), ask **at least 3 design/UX clarifying questions** before making changes. Use the `AskUserQuestion` tool so options are easy to pick.
- Cover the dimensions that are actually ambiguous for the task — e.g. hex/board layout and placement, visual hierarchy and styling, interaction and feedback (hover/focus/active/disabled, selected unit, reachable hexes), empty/loading/error states, responsiveness across breakpoints, animation/motion, and accessibility (keyboard navigation of the board, screen reader, contrast). Don't ask about things already settled in the request or the codebase.
- Ask **more** questions, not fewer, when new evidence arrives mid-task — a screenshot, the rendered result in the browser, a changed requirement, or anything that reveals a fork the original questions didn't cover. Treat each new piece of evidence as a prompt to re-check assumptions and clarify before proceeding.
- Prefer a single batched round of questions (up to 4 per `AskUserQuestion` call) over a slow back-and-forth, but never skip the round entirely to "just start coding."
- This raises the baseline permanently: err toward asking when in doubt rather than guessing on the author's behalf.

## Hard requirements

- Squash all PRs into a single commit instead of merging/rebasing. Exception: follow-up commits based on feedback.
- When creating a follow-up commit, record the feedback as an issue comment.
- All functionality must have test coverage.
- If a change requires more than 150 lines of changes to application code (excluding CSS, tests, config, etc), split it up into multiple changes and create followup tasks.
- Code should be as compartmentalized as possible, including CSS.
- Code should be written in strict typescript, no use of any types.
- Typed Next.js Server Actions are the required client–server contract (intents and authoritative per-viewer state both flow through Server Actions); no ad-hoc REST endpoints for game state (design §4).
- The client is untrusted and near-stateless: it renders authoritative state and sends _intents_; it never computes outcomes. Game logic lives in the pure `/engine` module and on the server (design §2–§4). The server will always provide a list of available moves that will be reflected in the UI.
- When developing new branches, only work in worktrees.
- Always use the issue template at `.github/ISSUE_TEMPLATE/issue.yml` when creating issues.
- Use pnpm for all package management and script execution (e.g. `pnpm install`, `pnpm test`, `pnpm build`). Do not use npm or yarn.

## Testing

- Unit tests should only have one assertion per test unless they're testing a multistep flow. The pure engine gets exhaustive unit tests; randomness is server-seeded, so the same seed + action log reproduces the same outcome.
- Full-app / full-flow integration tests that mount a match and exercise a sequence of intents SHOULD use multiple assertions per test when those assertions all describe the same end-state. The mount + interaction setup is the expensive part; sharing one mount across related assertions cuts wall-clock cost without losing intent. The test name should describe the scenario (e.g. "Macedon deadline score for two captured cities with a flank bonus"), not each individual assertion.
- Include the most important "negative" test case whenever possible (illegal intent, acting out of turn, stale state version, attacking out of range).
- When a single test file approaches 1500 lines or more, create a follow up issue to see if it can be split into something smaller.
- Always seek to extract shared helpers/constants rather than re-implementing things.
- Whenever possible, visually verify your changes in a headless browser.

## Style

- Do not add comments to code, especially CSS.
- Break things up into logical subdirectories, but don't overdo it.
- Never reference issue numbers anywhere in source code — comments, test/describe names, file names, etc. Tying source to an issue number is an anti-pattern: describe the behavior instead (e.g. `test("Royal Road redeploy", ...)`, not `test("Royal Road redeploy (#42)", ...)`).

## Semantic commits

Use semantic (or Conventional) Commits to provide a standardized framework for naming git commits. Automatically apply a label of the matching name and create one if it does not already exist.

## Git & Worktrees

- One worktree per branch/PR, created at `~/.cache/browcivvi-worktrees/<branch>` (outside the project tree, so test workers don't hit a parent config). Run `pnpm install --frozen-lockfile --prefer-offline` in every fresh worktree before anything else (skips the resolution pass and registry round-trips; packages hardlink from the shared global store). Report whether or not this was nearly instant (slower executions indicate a project setup issue).
- When a session juggles multiple issues, never reuse another issue's worktree; each issue gets its own.

## Work with feature branches

- When creating a new issue, in addition to using semantic naming, set GitHub's native issue type (one of: `Bug`, `Feature`, `Task`, `Refactor`, `Chore`) and add a label for the feature space (e.g. `map`, `combat`, `ai`, `leaderboard`, `content`). Do not use labels for the issue type.
- When asked to complete a task, first create a new worktree/branch based on the issue number and title. Do not commit directly to main. Create a pull request when done.
- Don't escape backtick literals (`) in PR descriptions. This includes triple backticks (\```)
- Always merge/rebase main before pushing new code, including every update to existing branches/PRs. When main has progressed, only allow progress if the new changes are touching core application code (and not config files).
- After every push, wait for the CI status. If a test fails or a merge conflict exists, try to resolve it immediately.
- Never merge a PR unless all CI statuses are green.
- Always leave a comment on the issue to indicate work on an issue has started.

## Documentation

Consult `docs/design.md` before diving into unfamiliar areas — it is the single source of truth and is cross-referenced by section number throughout the code and issues. Key sections:

- §3 — threat model & integrity (why the architecture is server-authoritative).
- §4 — architecture (Next.js App Router on Vercel, Server Actions as the intent channel, the pure `/engine`, Postgres + `JSONB` persistence behind the `MatchStore` interface with schema-versioned upcasters).
- §5 — game model (hex map, data-driven units/factions, turn structure, swappable combat module, per-faction scoring).
- §6 — the `Intent` / `SubmitResult` contract.
- §7 — the pure, seeded, server-side AI opponent.
- §9 — the PR-by-PR roadmap (each slice ≤ ~150 app-code lines).
- §10–§12 — historical accuracy, the educational media layer, and divergence nodes.
- §13 — the data-driven faction/unit/effect mechanics catalog.
- §14 — open questions still pending the author's decision.

As the codebase grows, add focused onboarding docs under `docs/onboarding/` (architecture, the engine, persistence, the board UI) and keep them cross-linked from here.

Onboarding docs:

- [`docs/onboarding/dev-setup.md`](docs/onboarding/dev-setup.md) — local setup.
- [`docs/onboarding/styling-tokens.md`](docs/onboarding/styling-tokens.md) — the two-tier CSS design-token system (color primitives → semantic aliases, plus radius/spacing/type/motion scales); component CSS must use tokens, enforced in CI.
- [`docs/onboarding/linting.md`](docs/onboarding/linting.md) — the ESLint / Prettier / Stylelint / markdownlint stack, the few justified config deviations, and the pre-commit hook.
- [`docs/onboarding/testing.md`](docs/onboarding/testing.md) — the test pyramid (engine → server-action contract → mocked front-end flow → browser e2e) and the typecheck-as-tripwire guardrail that keeps mocked intents from drifting from the real Server Actions.
- [`docs/onboarding/screenshots.md`](docs/onboarding/screenshots.md) — the `docs/assets/` per-PR image convention and the `pnpm screenshots` helper (GitHub has no image-attachment API, so images are committed and hotlinked).

## Project Environment

- This project uses **pnpm**, not npm or Yarn. Use `pnpm` commands. Run `pnpm install --frozen-lockfile --prefer-offline` in every fresh clone or worktree before anything else.
- TypeScript is the primary language — all new code should be `.ts`/`.tsx`.
- Run `pnpm typecheck`, `pnpm lint`, `pnpm lint:css`, `pnpm lint:md`, `pnpm format:check`, and `pnpm test` before opening PRs (all enforced in CI; a husky pre-commit hook runs lint-staged on changed files).
- Use `import`, not `require()` — this is an ESM project.
