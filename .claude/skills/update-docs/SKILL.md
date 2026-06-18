---
name: update-docs
description: Update files under docs/ to reflect the most recently merged PR on main. Use when the user invokes /update-docs after a merge, or when they ask to "sync docs" / "update docs for the last merge". Pulls the latest merged PR via gh, inspects its diff against docs/, and proposes targeted edits — never writes speculative documentation.
---

# update-docs

Sync the project's `docs/` folder with the most recently merged pull request on `main`. The skill is manual — the user runs `/update-docs` after a merge.

`docs/design.md` is the single source of truth: §-numbered sections cross-referenced throughout the code and issues. `docs/onboarding/` holds focused onboarding docs (e.g. `dev-setup.md`).

## Hard rules

- Only touch files inside `docs/`. Do **not** modify `README.md`, `CLAUDE.md`, `CHANGELOG.md`, or source code.
- Never invent documentation for behavior the PR didn't change. If nothing in `docs/` is affected, say so and stop.
- Keep `docs/design.md` edits **additive** and preserve the existing §-section numbering — other docs, code, and issues reference those numbers. Don't renumber sections.
- One `docs/` edit per logical doc change; prefer editing existing files over creating new ones. New gameplay surfaces may warrant a new file under `docs/onboarding/`.
- Match the existing style of `docs/design.md` (Markdown `##`/`###` headings, fenced code blocks, no emojis, no trailing summaries).
- Adhere to project rules in `CLAUDE.md` (repo root): no comments beyond what the existing doc uses; strict TypeScript in any code samples; GraphQL as the client–server API; server-authoritative / pure-engine framing.

## Procedure

### 1. Identify the merged PR

Prefer the `gh` CLI to find the most recently merged PR on `main`:

```bash
gh pr list --state merged --base main --limit 1 --json number,title,mergedAt,headRefName,body,url
```

If `gh` is unavailable, fall back to the GitHub MCP (`mcp__github__list_pull_requests`, state: closed, base: main, limit: 1), then to git:

```bash
git log -1 --merges --first-parent main --pretty='%H%n%s%n%b'
```

Confirm the PR number and title with the user in one short sentence before proceeding (e.g., "Syncing docs for #42 — Royal Road redeploy. Proceed?"). If the user just merged it themselves in this session and the number is unambiguous, skip the confirmation.

### 2. Inspect what actually changed

```bash
gh pr diff <PR_NUMBER> --name-only
```

Fall back to `mcp__github__pull_request_read` (returns per-file paths and patches) if `gh` is unavailable.

For each non-test, non-CSS, non-config source file in the diff, decide whether it represents:

- **Architecture or data-model change** (engine, persistence, intent contract, GraphQL schema) → may belong in the matching `docs/design.md` section (§2–§6).
- **New gameplay system or content** (a new unit/faction effect, combat rule, scoring path, divergence node, media surface) → may warrant an edit to the relevant section (§5, §10–§13) or a new `docs/onboarding/<topic>.md`.
- **Bug fix / refactor with no behavioral change** → usually no doc update. Skip.

Default bias: **skip**. Only update docs when the PR genuinely changed something a future reader of `docs/` would need to know.

### 3. Locate the affected doc sections

```bash
grep -nE '^#{2,3} ' docs/design.md docs/onboarding/*.md
```

Map PR-touched code areas to existing sections by keyword (e.g., scoring → §5 game model / per-faction scoring; a schema change → §4 architecture or §6 intent contract). Read the section in full before editing — don't patch partial sentences.

### 4. Propose edits

Before writing, show the user a brief list:

```
docs/design.md
  - §5 Game model: note loyal-defection now grants the flank bonus on capture
docs/onboarding/dev-setup.md
  - add the new yarn script introduced by the PR
```

Wait for approval, then apply via `Edit`. If a doc carries a status/date header (e.g. design.md's `> Status:` line), update it only when the change warrants it; do not invent a date.

### 5. Verify

- Re-read each edited section to confirm it reads naturally end-to-end and its §-cross-references still resolve.
- Run `yarn build` / `yarn typecheck` only if a code sample was changed and the user requests verification — otherwise docs changes don't need a build.

### 6. Report

One or two sentences: which files changed, which sections, and the PR number (as a link). No trailing summary beyond that.

## When to do nothing

- The merged PR is a docs-only change (already updated itself).
- The PR is a dependency bump, CI tweak, test-only change, or pure refactor.
- The PR's behavioral change is already accurately described in `docs/`.

In those cases, report "No `docs/` updates needed for #NNN — <one-line reason>" and exit.