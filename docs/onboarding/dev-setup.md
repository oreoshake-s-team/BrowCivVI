# Local development setup (Windows)

This guide gets a new **Windows** machine ready to develop BrowCivVI. It is the companion to [`../../CLAUDE.md`](../../CLAUDE.md) (conventions) and [`../design.md`](../design.md) (architecture). Read both before writing code.

## Where things stand

The repo currently contains **documentation only** (this guide, the design doc, `CLAUDE.md`, and the issue template). There is **no application code yet** — the first coding task is scaffolding the Next.js app (design §9, slice 1: "Repo + skeleton"). So "ready to develop" means tooling installed, repo cloned, and the first scaffold PR begun.

## Prerequisites

- **Git for Windows** (includes Git Bash) — <https://git-scm.com/download/win>
- **Node.js LTS (>= 20)** — <https://nodejs.org>
- **pnpm via Corepack** (do *not* `npm i -g pnpm`). Corepack ships with Node; enable it once: `corepack enable`. The project pins pnpm in `package.json` (`packageManager`), so Corepack picks the right version automatically.
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
pnpm install
pnpm typecheck
pnpm test
pnpm dev        # http://localhost:3000
```

Until the app is scaffolded there is nothing to install — start with the scaffold PR (below).

## Day-to-day (after scaffold)

- `pnpm dev` — run the app locally.
- `pnpm typecheck` — strict TS; must be clean before a PR.
- `pnpm test` — unit + integration; run after every meaningful change.
- `pnpm build` — production build. Runs `prisma migrate deploy` first **when a database URL is set** (preferring `DATABASE_URL_UNPOOLED`), then `next build`; with no DB URL configured it skips migration and just builds.
- `pnpm db:migrate` — create/apply a migration locally during development (`prisma migrate dev`).
- `pnpm db:deploy` — apply pending migrations to a target database (`prisma migrate deploy`).

### Database migrations on deploy

Preview and production **auto-migrate at build**: `pnpm build` applies pending migrations before compiling, so a freshly provisioned database (e.g. a new Neon branch) gets its schema without a manual step. Migrations run against the unpooled connection (`DATABASE_URL_UNPOOLED`) because Prisma's advisory locks don't work over the PgBouncer pooler. Vercel's Build Command is pinned to `pnpm build` in `vercel.json` so the wrapper runs on every deploy.

## Windows gotchas

- **Line endings.** The committed `.gitattributes` normalizes everything to LF. Also set once: `git config --global core.autocrlf input`. Don't let editors rewrite files to CRLF.
- **Worktrees.** One worktree per branch at `~/.cache/browcivvi-worktrees/<branch>` (outside the repo tree). In WSL2 that's a normal home path; in native Windows it resolves under your user profile — keep it off the repo tree either way.
- **Path length / case.** Prefer a short repo path (`C:\src\BrowCivVI`, or `~/code/BrowCivVI` in WSL2). Treat paths as case-sensitive (CI is Linux).
- **Hooks are bash.** `.claude/hooks/*.sh` need a bash shell (Git Bash or WSL2).

## Environment variables

Secrets live only in a local, git-ignored `.env.local` (the `.env*` glob is ignored) and in the Vercel project settings — never commit them.

### Auth0 (optional locally)

Authentication is **additive**: with none of these set, the app runs in anonymous signed-cookie mode (design §3/§14) and every route is open. Set all four required vars to turn on real sign-in. Once configured, access is **opt-out** — every route except the public home page (`/`) and the `/auth/*` routes requires sign-in (enforced in middleware); unauthenticated visitors are redirected to Auth0 Universal Login (with a `returnTo`), and the session resolves to a stable `userId` (the Auth0 `sub`).

| Variable | Required | Purpose |
| --- | --- | --- |
| `AUTH0_DOMAIN` | yes | Tenant domain, e.g. `your-tenant.us.auth0.com`. |
| `AUTH0_CLIENT_ID` | yes | Application client id. |
| `AUTH0_CLIENT_SECRET` | yes | Application client secret. |
| `AUTH0_SECRET` | yes | 32-byte random string for cookie encryption (`openssl rand -hex 32`). |
| `APP_BASE_URL` | for callbacks | App origin, e.g. `http://localhost:3000`. |

In the Auth0 dashboard, add `${APP_BASE_URL}/auth/callback` to **Allowed Callback URLs** and `${APP_BASE_URL}` to **Allowed Logout URLs**. The login / logout / callback routes are mounted automatically by the Auth0 middleware at `/auth/*`.

## Workflow rules (don't skip)

From `CLAUDE.md` and design §9:

- Branch per issue; never commit to `main`. One worktree per branch.
- Conventional commits; squash-merge each PR to a single commit.
- Strict TypeScript, no `any`; ESM (`import`, not `require`).
- **Typed Next.js Server Actions are the client-server contract** (design §4/§8).
- Keep app-code diffs **<= 150 lines** per PR; split bigger work into follow-ups.
- All functionality test-covered (happy path + at least one negative case).
- `pnpm typecheck` and `pnpm test` green before opening a PR.

## Start here when you wake up

1. Open **PR #1** and skim the latest `docs/design.md` — today's decisions (Granicus start, supply & morale, loyalty/defection, Darius framing, Tides citations) are captured there.
2. Decide the still-open items in `docs/design.md` §14 and from chat: the **roguelite** meta-progression scope, **Roxana** integration, and the **unique-unit roster** (sarissa phalanx in, Hypaspists out?).
3. File the first code issue with the template: **"Repo + skeleton"** (design §9.1) — Next.js App Router + strict TS + test runner + CI. Then branch, scaffold, and open the PR.
