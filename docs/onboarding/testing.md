# Testing strategy

This guide describes how BrowCivVI is tested today and where each kind of test
belongs. It is the companion to [`../../CLAUDE.md`](../../CLAUDE.md) (conventions)
and [`../design.md`](../design.md) (architecture, especially §2–§4 on the
server-authoritative model). Read the "Testing" section of `CLAUDE.md` first —
this doc expands on it, it does not replace it.

## The test pyramid

The architecture is **server-authoritative**: the client renders authoritative
state and sends _intents_; it never computes outcomes (`design.md` §2–§3). That
shape dictates the layers:

1. **Engine unit tests** (`src/engine/**`). The pure rules engine gets exhaustive
   unit tests. Randomness is server-seeded, so the same seed + action log
   reproduces the same outcome. One assertion per test (see `CLAUDE.md`).
2. **Server-action / contract tests.** The intent channel — the typed Next.js
   Server Actions in `src/app/play/actions.ts` (`loadBoard`, `move`, `attack`,
   `targetsFor`, …) — exercised against the real engine plus an in-memory
   `MatchStore`, with no browser. These cover legality, turn ownership, and
   optimistic-concurrency rejection.
3. **Front-end flow tests** (`src/components/**`). React components mounted in
   jsdom with the Server Actions **mocked**, driven through a full intent
   sequence. These are fast and deterministic because the client holds no rules
   logic of its own. See `PlayBoard.test.tsx` for the canonical example.
4. **Browser end-to-end** (not yet present). A thin smoke layer — a real browser
   hitting a running app against a seeded store — is deferred until the loop is
   richer. Keep it thin: the layers above already cover the rules.

A full-flow test that mounts a match and plays a short sequence SHOULD use
multiple assertions describing one end-state (the mount is the expensive part).
Name the test after the scenario, not each assertion.

## Mocking the intent channel without drifting from it

Front-end flow tests mock the Server Actions so the UI can be driven without a
server. The risk is **mock drift**: a mock that lies about an action's shape
would let UI tests pass against a contract that can't exist.

Because the intent channel is **typed TypeScript Server Actions** (not a separate
schema), the guardrail is free and automatic: `yarn typecheck` is the drift
tripwire. Two rules make it bite:

- Mock the module with a factory of bare `vi.fn()`s so the real server-only
  module (cookies, Prisma) never loads:

  ```ts
  vi.mock("@/app/play/actions", () => ({
    loadBoard: vi.fn(),
    move: vi.fn(),
    attack: vi.fn(),
    targetsFor: vi.fn(),
    newGame: vi.fn(),
    reachableFor: vi.fn(),
  }));
  ```

- Type every mocked return value against the action's **real** return type, via
  `import * as actions` + `vi.mocked(...)` and a `satisfies` annotation:

  ```ts
  import * as actions from "@/app/play/actions";
  import type { MoveOutcome } from "@/app/play/actions";

  vi.mocked(actions.move).mockResolvedValue({
    ok: true,
    units: movedUnits,
    reachable: [],
  } satisfies MoveOutcome);
  ```

If a Server Action's signature or return interface changes, the typed fixtures
stop compiling and CI fails before the lying mock can ship. No codegen, no
schema-contract job, no separately maintained mock types.

## Running the tests

```bash
yarn test         # full Vitest suite (run mode)
yarn typecheck    # the mock-drift tripwire, among other things
yarn lint         # ESLint
```

jsdom is opt-in per file (the engine runs in the default `node` environment). A
component/flow test starts with `// @vitest-environment jsdom` on line 1.

## Follow-ups

- Server-action/contract tests for the intent channel against an in-memory store.
- Flow coverage for the attack and new-game paths (`attack`, `newGame`) following
  the `PlayBoard.test.tsx` pattern.
- A first browser e2e smoke test of `/play` once a runner is chosen.
