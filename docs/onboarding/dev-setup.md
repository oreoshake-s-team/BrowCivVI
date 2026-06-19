# Local development setup (Windows)

This guide gets a new **Windows** machine ready to develop BrowCivVI. It is the companion to [`../../CLAUDE.md`](../../CLAUDE.md) (conventions) and [`../design.md`](../design.md) (architecture). Read both before writing code.

## Where things stand

The repo currently contains **documentation only** (this guide, the design doc, `CLAUDE.md`, and the issue template). There is **no application code yet** — the first coding task is scaffolding the Next.js app (design §9, slice 1: "Repo + skeleton"). So "ready to develop" means tooling installed, repo cloned, and the first scaffold PR begun.

## Prerequisites

- **Git for Windows** (includes Git Bash) — <https://git-scm.com/download/win>
- **Node.js LTS (>= 20)** — <https://nodejs.org>
- **Yarn Berry via Corepack** (do *not* `npm i -g yarn`). Corepack ships with Node; enable it once: `corepack enable`. The project pins Yarn in `package.json` (`packageManager`) once scaffolded, so Corepack picks the right version automatically.
- A terminal: **PowerShell**, **Git Bash**, or (recommended) a **WSL2** shell.

## Recommended: develop inside WSL2

We strongly recommend **WSL2 (Ubuntu)** on this Windows box:

- It matches the Linux CI environment, so "works on my machine" == "works in CI".
- The worktree workflow and the bash hook (`.claude/hooks/worktree-guard.sh`) run natively.
- Fewer line-ending / path surprises.

Install: run `wsl --install` in an elevated PowerShell, reboot, then do all the steps below *inside* the WSL2 shell. Keep the repo on the Linux filesystem (e.g. `~/code/BrowCivVI`), **not** under `/mnt/c`, for good file-watch/IO speed.

Native Windows works too — just mind the gotchas below.

## First-time setup

```bash
git clone <repo-url> BrowCivVI
cd BrowCivVI
corepack enable
# once the app is scaffolded:
yarn install
yarn typecheck
yarn test
yarn dev        # http://localhost:3000
```

Until the app is scaffolded there is nothing to install — start with the scaffold PR (below).

## Day-to-day (after scaffold)

- `yarn dev` — run the app locally.
- `yarn typecheck` — strict TS; must be clean before a PR.
- `yarn test` — unit + integration; run after every meaningful change.
- `yarn build` — production build.

## Windows gotchas

- **Line endings.** The committed `.gitattributes` normalizes everything to LF. Also set once: `git config --global core.autocrlf input`. Don't let editors rewrite files to CRLF.
- **Worktrees.** One worktree per branch at `~/.cache/browcivvi-worktrees/<branch>` (outside the repo tree). In WSL2 that's a normal home path; in native Windows it resolves under your user profile — keep it off the repo tree either way.
- **Path length / case.** Prefer a short repo path (`C:\src\BrowCivVI`, or `~/code/BrowCivVI` in WSL2). Treat paths as case-sensitive (CI is Linux).
- **Hooks are bash.** `.claude/hooks/*.sh` need a bash shell (Git Bash or WSL2).

## Workflow rules (don't skip)

From `CLAUDE.md` and design §9:

- Branch per issue; never commit to `main`. One worktree per branch.
- Conventional commits; squash-merge each PR to a single commit.
- Strict TypeScript, no `any`; ESM (`import`, not `require`).
- **Typed Next.js Server Actions are the client-server contract** (design §4/§8).
- Keep app-code diffs **<= 150 lines** per PR; split bigger work into follow-ups.
- All functionality test-covered (happy path + at least one negative case).
- `yarn typecheck` and `yarn test` green before opening a PR.

## Start here when you wake up

1. Open **PR #1** and skim the latest `docs/design.md` — today's decisions (Granicus start, supply & morale, loyalty/defection, Darius framing, Tides citations) are captured there.
2. Decide the still-open items in `docs/design.md` §14 and from chat: the **roguelite** meta-progression scope, **Roxana** integration, and the **unique-unit roster** (sarissa phalanx in, Hypaspists out?).
3. File the first code issue with the template: **"Repo + skeleton"** (design §9.1) — Next.js App Router + strict TS + test runner + CI. Then branch, scaffold, and open the PR.
