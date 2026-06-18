# Linting & formatting

The repo enforces a strict, best-practice tooling stack. Everything below runs in
CI (each as its own step) and on every commit via a husky + lint-staged pre-commit
hook that fixes/blocks only the changed files.

## Tools

- **ESLint** (`eslint.config.mjs`, flat config) — `@eslint/js` recommended,
  `typescript-eslint` **strict-type-checked + stylistic-type-checked** (type-aware),
  React, React Hooks, `jsx-a11y`, `@next/eslint-plugin-next` (core-web-vitals),
  `eslint-plugin-import-x`, and `@vitest/eslint-plugin` for tests. Formatting rules
  are deferred to Prettier via `eslint-config-prettier`.
- **Prettier** — formats TS/TSX/JS/JSON/CSS (`printWidth: 100`). It does **not**
  touch Markdown; markdownlint owns prose.
- **Stylelint** (`stylelint-config-standard`) — CSS modules and tokens.
- **markdownlint-cli2** — Markdown under `docs/` and the root `*.md` files.

## Commands

```bash
yarn lint            # ESLint
yarn lint:fix        # ESLint --fix
yarn lint:css        # Stylelint
yarn lint:md         # markdownlint
yarn format          # Prettier --write
yarn format:check    # Prettier --check
```

## Guiding rule

Where our code diverged from a well-accepted default, we fixed the code rather than
disabling the rule. The handful of config adjustments below are deliberate and
narrowly scoped — not blanket opt-outs.

| Adjustment | Scope | Why |
| --- | --- | --- |
| `restrict-template-expressions` `allowNumber: true` | all TS | Interpolating a number into a string is safe and idiomatic; this is the rule's own standalone default. |
| `require-await` off | `src/app/**/actions.ts` | Next.js Server Actions must be `async` even when the body is synchronous. |
| `selector-class-pattern` camelCase | `*.module.css` | CSS Modules are accessed as `styles.camelCase` in TSX, so camelCase is the accepted Module convention (kebab-case is for global CSS). |
| markdownlint `MD013` off | Markdown | Line-length limits do not suit authored prose. |
| markdownlint `MD029` off | Markdown | The §9 roadmap uses intentional continuous numbering across phase groupings. |
| markdownlint scope excludes `.claude/`, `.github/` | Markdown | Agent skill files and GitHub templates follow their own conventions (e.g. no top-level heading). |

Genuine issues were fixed in code, not configured away — for example, async event
handlers are wrapped with `void` at the call site (`no-misused-promises`), and
jsdom's missing `setPointerCapture`/`releasePointerCapture` are stubbed in the test
rather than guarded with an optional chain in the component.
