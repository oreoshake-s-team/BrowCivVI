---
name: ship-issue
description: Implement a GitHub issue end-to-end — create worktree/branch, implement, test, open PR, confirm green CI. Use when the user says "implement issue #N" or "ship issue #N".
---

# ship-issue

Implement a GitHub issue from start to a merge-ready green PR. Drive the entire loop autonomously; only pause for genuine blockers, ambiguous requirements, or unresolved UI/UX decisions.

## Hard rules

- Never commit directly to `main`. Always work in a worktree + branch (CLAUDE.md).
- Match **authentic history and authentic Civ 6 effects** — do not invent placeholder mechanics. Reference `docs/design.md` (and its citations), the Civ 6 wiki, or ask the user if unsure. The authored baseline (the 334 BC opening at the Granicus, map, geography, content) must be historically exact; geography is enforced, dates are flavor (design §10).
- Before acting on any ambiguous term (e.g. **Royal Road**, **Immortals**, **Hetairoi**, **phalangites / sarissa**, **satrapy**, **flanking**, **great general**, **divergence node**, **hex**), restate in one line what the issue covers and flag terms that could be a game/historical concept vs. a GitHub/tooling concept.
- Keep app-code changes under ~150 lines (excl. tests/CSS/config). If it would exceed that, split into sub-issues and create follow-up tasks **before** proceeding (design §9).
- Strict TypeScript — no `any`. Use `import`, not `require()` (this is an ESM project).
- Client→server is **typed Server Actions only** (intents and authoritative per-viewer state both flow through Server Actions). No ad-hoc REST for game state (design §4).
- The client is untrusted and near-stateless: it renders authoritative state and sends intents; game logic lives in the pure `/engine` and on the server (design §2–§4).
- Prioritize accessibility and i18n; keep code and CSS compartmentalized (per-component CSS, no inline styles).
- Never reference issue numbers in source — comments, test/`describe` names, file names. Describe the behavior instead.
- Use **pnpm**, not npm or yarn, for all package management and scripts.

## Design & UX gate (do this before writing UI code)

If the issue touches UI, layout, visuals, interaction, or UX (the hex board, unit/city rendering, combat feedback, media cards, leaderboards), ask **at least 3 design/UX clarifying questions** via the `AskUserQuestion` tool before changing anything — covering the dimensions that are genuinely ambiguous (board layout/placement, visual hierarchy, hover/focus/active/selected/reachable-hex feedback, empty/loading/error states, responsiveness, motion, keyboard/screen-reader/contrast a11y). Ask **more** when new evidence (a screenshot, the rendered result) reveals a fork. Don't skip the round to "just start coding."

## Procedure

### 1. Start

Prefer the `gh` CLI for all GitHub API calls. Read the issue body in full, then **leave a comment on the issue indicating work has started** (CLAUDE.md).

### 2. Create a worktree and branch

Branch name: `<N>-<kebab-title>` (e.g. `42-royal-road-redeploy`).
Worktree path: `~/.cache/browcivvi-worktrees/<branch-name>` (outside the project tree, so test workers don't hit a parent config). Each issue gets its own worktree — never reuse another issue's.

```bash
mkdir -p ~/.cache/browcivvi-worktrees
git worktree add ~/.cache/browcivvi-worktrees/<branch> -b <branch> main
cd ~/.cache/browcivvi-worktrees/<branch> && pnpm install
```

Run `pnpm install` before anything else and report whether it was nearly instant (slower runs indicate a project setup issue).

### 3. Implement

- Read the relevant source files (and `docs/design.md` for the area) before editing.
- Write strict TypeScript — no `any`, no `require()`. Keep game logic in the pure `/engine` / server; the client only renders authoritative state and sends intents.
- Keep each changed file under ~150 lines of app code.
- Add or update CSS in the component's own CSS file; do not add inline styles.
- Build for accessibility and i18n (keyboard board navigation, screen-reader labels, contrast, no hard-coded user-facing strings).

### 4. Test

```bash
time pnpm typecheck
time pnpm test
```

Fix all type errors and test failures before proceeding. Add tests covering:

- The happy path.
- The most important **negative** case (illegal intent, acting out of turn, stale state version, attacking out of range).

One assertion per unit test unless testing a multi-step flow; full-app/full-flow tests may share one mount across related assertions describing the same end-state. Randomness is server-seeded — same seed + action log reproduces the same outcome. No comments in tests. Whenever possible, **visually verify UI changes in a headless browser**.

### 5. Commit

Semantic / Conventional Commit message (e.g. `feat(map): Royal Road redeploy`). Apply the matching semantic label (create it if missing). PRs are **squashed into a single commit** on merge — keep the branch to one logical commit. Exception: follow-up commits made in response to review feedback; when you make one, record that feedback as a comment on the issue.

### 6. Push and open PR

```bash
git push -u origin <branch>
```

- Use the repo PR template; fill in the checklist honestly.
- Do not let escaped backticks (including ```` ``` ````) leak into the PR description.
- Use closing keywords (`Closes #N`) so the issue auto-closes on merge.
- Always merge/rebase `main` before pushing (see step 9).

### 7. Add Vercel preview URL

After the PR is created, fetch the Vercel preview URL for the branch and add it to the PR body. If a Vercel MCP tool (`mcp__plugin_vercel_vercel__*` / `list_deployments`) is available, poll until the deployment state is `READY` (retry ~10× with a short delay), then append to the PR body:

```markdown
## Preview
[Vercel Preview](<url>)
```

Update the PR body with `gh pr edit` (or `mcp__github__update_pull_request`). If Vercel isn't connected or no deployment is found after polling, try to extract the URL from the PR checks, otherwise skip.

### 8. Include screenshots (if applicable)

For UI changes, provide before/after images of what changed, captured via headless Chrome.

### 9. Rebase loop

```bash
git fetch origin main
git rebase origin/main
git push --force-with-lease
```

Repeat until `git status` shows 0 commits behind `origin/main`. When `main` has progressed, only push if the new changes touch core application code (not just config files).

### 10. Wait for CI

After every push, wait for CI. Poll with `gh run watch` (or the GitHub MCP run tools). If any check fails or a merge conflict exists, diagnose, fix, push a new commit, and re-poll. Do not stop until all checks are green. Never merge a PR unless all CI statuses are green.

### 11. Report

One sentence: PR link, Vercel preview link, and CI status as they become available. Always use links, not bare issue/PR numbers.

## When to pause

- Issue requirements are genuinely ambiguous after reading the issue body.
- A UI/UX decision is unresolved — run the design-question gate above.
- Implementation would exceed ~150 app-code lines — create sub-issues first.
- A test failure requires a design decision outside the issue scope.

State the blocker in one sentence; do not stop silently.
