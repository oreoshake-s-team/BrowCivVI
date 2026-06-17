# Conquest of Alexander — Design Doc (v0)

> Status: **DRAFT for review**. Scope: the *first* design — a stripped-down but
> heavily-moddable core. This doc fixes the architecture and the data model so
> later changes are additive, not rewrites.

---

## 1. Vision

A browser, turn-based, 4X-*lite* strategy game themed on Civ 6's
**"Conquest of Alexander"** scenario, on a fixed historical hex map, racing a
**hard turn limit**. Two **asymmetric playable factions** (see §5):

- **Macedon / Alexander** — offense: conquer-by-deadline score.
- **Persia / Darius** — defense: attrition score (Macedonian units destroyed +
  cities held).

Playable **solo vs AI** or **human-vs-human (PvP)**. Final scores land on
**separate per-faction leaderboards**.

We deliberately drop the *eXplore* and *eXpand* pillars of 4X and keep
**eXploit + eXterminate**: a known map, a fixed starting army, war against the
clock.

### Scope & phasing
- **Phase 1 (MVP) — solo vs AI as Alexander** (offense). Proves the
  server-authoritative architecture end-to-end with a single faction flow.
- **Phase 2 — solo vs AI as Darius** (defense / attrition). Adds the second
  asymmetric faction and the AI playing the *aggressor* side.
- **Phase 3 — PvP** (human Macedon vs human Persia). The data model carries
  **two player slots** and **per-viewer rendering** from day one, so PvP is
  additive, not a rewrite.
- Cross-cutting (phased in alongside the above, details in §10–§11):
  **historical-accuracy constraints** on all content data, and an
  **educational media layer**.
- Out of scope for now: districts, tech tree, diplomacy, economy beyond
  conquest/attrition needs; procedural maps (the map is authored data).

---

## 2. First principles

1. **The client is untrusted and near-stateless.** It renders authoritative
   state and collects *intents*. It never computes outcomes. (This is the whole
   genesis of the project — see §4.)
2. **State lives on the server.** The browser holds only what the server last
   sent it.
3. **Content is data; rules are pure engines.** Units, terrain, city values,
   AI personalities, Alexander's bonuses — all authored as typed data. The
   engine is a pure function `(state, intent) -> state`. "Highly modified"
   becomes "edit a data file," not "rewrite the engine."
4. **Determinism.** Given a match seed + the ordered action log, the entire game
   is reproducible. This underpins both testing and anti-cheat (§3).

---

## 3. Threat model & integrity (why server-authoritative)

The player fully controls their browser, DevTools, and network. We do **not**
try to stop that. Instead:

| Asset to protect | Attack | Defense |
| --- | --- | --- |
| Leaderboard score | Client submits a fake score | Client **cannot** submit scores. Score is *derived* server-side from the authoritative state at the deadline. |
| Match legitimacy | Client forges a result ("I captured Babylon") | Client sends only **intents**; server validates legality and computes the result. |
| Save-scumming RNG | Retrying an action until combat RNG is favorable | All randomness is derived server-side from a **secret per-match seed + turn counter**. The same action always resolves the same way; retrying gains nothing. |
| Replay / double-submit | Re-sending a captured request | Each action carries an **idempotency key** and a **state version**; stale/duplicate versions are rejected (optimistic concurrency). |
| Session hijack / impersonation | Acting as another player | Short-lived session (JWT or framework session cookie) identifies the player; ownership checked on every action. |
| Inspecting hidden info | Reading AI plans / fog-of-war from network | Hidden state is **never sent** to the client until revealed. |
| Peeking at a human opponent (PvP) | Reading the other player's units/plans off your own client | Server renders **per-viewer**: each response contains only what *that* faction can see. The opponent's hidden state never leaves the server. |
| Acting out of turn (PvP) | Submitting intents when it isn't your turn | Server enforces **turn ownership**: intents from the non-active slot are rejected. |

> With PvP, *both* players are mutually untrusted adversaries — the
> server-authoritative model is doing its most important work here, not just
> guarding a leaderboard.

> JWT's role: authentication of *who* is acting, plus short expiry to bound
> replay. It is **not** a place to store trusted game state.

Optional later: persist the full action log so any leaderboard entry can be
**re-simulated** server-side for verification.

---

## 4. Architecture

```
Browser (RSC + minimal client islands)
  │  user clicks a hex / unit / "End Turn"
  ▼
Server Action  submitIntent(matchId, intent, version, idempotencyKey)
  │  1. authenticate (session) → playerId
  │  2. load authoritative MatchState from DB (with version)
  │  3. validate intent against rules engine
  │  4. apply: state' = engine(state, intent)   [pure]
  │  5. run AI turn if End-Turn → state''        [pure, seeded]
  │  6. persist state'' with version+1 (optimistic lock)
  ▼  7. revalidate → stream re-rendered RSC view (or return JSON)
Browser re-renders authoritative view
```

- **Next.js App Router** on **Vercel** (serverless functions).
- **Server Actions** are the intent channel (the "API"). Component-over-the-wire:
  the server returns a freshly rendered tree, so the client holds almost no
  logic — directly serving the integrity goal.
- The **rules engine** is a framework-agnostic pure TS module (`/engine`),
  trivially unit-testable with no Next.js in scope.

### Persistence

The engine never imports a database. All storage sits behind one interface so
the storage engine is reversible and the pure engine stays testable:

```ts
interface MatchStore {
  load(id: MatchId): Promise<{ state: MatchState; version: number } | null>;
  save(id: MatchId, state: MatchState, expectedVersion: number): Promise<void>; // throws on version mismatch
}
```

- First impl: **in-memory** (tests, local dev). Real impl swapped in later with
  no engine changes.
- Default real store: **Postgres + `JSONB`** — *not* a `TEXT` dump. The match
  aggregate is stored as a binary, indexable `JSONB` column; the **schema is
  enforced in TypeScript** at the read/write boundary (parser, e.g. Zod) and
  versioned with the code.
- **Evolving model strategy:** every stored aggregate carries a
  `schemaVersion`; shape changes are a TS type edit + an **upcaster**
  (`migrate(old) -> current`) run on read. No SQL migration for state-shape
  changes. (This technique is identical for a document DB — so an evolving
  model is *not* itself a reason to prefer one engine over the other.)
- Why relational over a document DB despite the evolving state: the
  **leaderboard** (sort/rank/aggregate/uniqueness) and the
  **optimistic-concurrency anti-replay** defense (§3) are relational sweet
  spots, and we avoid running a second datastore.
- Tables (sketch): `matches(id, player_id, seed, status, turn, version, schema_version, state_jsonb, created_at)`,
  `leaderboard(match_id, player_id, score, finished_at)`.
- Local dev: in-memory store or Postgres via Docker/Neon branch (avoid
  SQLite↔Postgres drift now that state is JSONB).

### Match & players
- A match has up to **two slots** (`macedon`, `persia`); each slot is a human
  `playerId` or `ai`. Solo = one human + one AI; PvP = two humans.
- The active slot is authoritative state; **only the active player's intents are
  accepted** (turn ownership, §3).
- **Per-viewer rendering:** the Server Action builds the response from the
  *requesting* player's visibility, so a human never receives the opponent's
  hidden state. The AI "sees" only inside the engine, server-side.
- **Turn handoff (PvP):** when a player ends their turn, the waiting player is
  notified it's their turn. Transport TBD (§10) — turn-based latency tolerance
  makes simple polling viable; SSE is the nicer upgrade.

---

## 5. Game model (v0)

### Map
- **Hex grid** using axial coordinates `{q, r}`. Authored as data: terrain per
  hex, movement cost, defense modifier.
- Cities are hexes flagged `city` with an owner, `value` (leaderboard weight),
  and defense strength.

### Units
- Data-driven `UnitType` (e.g. Hetairoi cavalry, Hypaspist, generic enemy
  garrison): `{ movement, strength, abilities[] }`.
- A `Unit` instance: `{ id, typeId, owner, hex, facing, hp, hasMovedThisTurn }`.
  `facing` (a hex direction) drives the front / flank / rear combat arcs used by
  flanking (§13).

### Turn structure
- `turn` counter with a fixed `turnLimit`.
- Player phase → "End Turn" → server resolves **AI phase** → next turn.
- At `turn === turnLimit`, match is `finished`; score is computed and written to
  the leaderboard.

### Combat (stripped-down, modular)
- Resolve via a **pure `resolveCombat(attacker, defender, terrain, rng)`** where
  `rng` is the seeded stream. v0 formula: deterministic strength differential +
  small seeded variance → HP damage. The *formula is a swappable module* so we
  can tune toward / away from Civ 6's combat math freely.

### Factions (asymmetric, data-driven)
A `Faction` is authored data — `{ id, leader, objective, abilities[],
uniqueUnits[] }` — so new sides and tuning are data edits, not engine changes.
Objective/ability effects are pure modules behind a registry; stubs return
identity so the engine stays green before each is implemented.

- **Macedon / Alexander — offense.** Objective: conquer-by-deadline score.
  Abilities (hooks now, effects later): "To the World's End" (no war-weariness),
  "Hellenistic Fusion" (capture bonus). Unique units: Hetairoi, Hypaspist.
- **Persia / Darius — defense (attrition).** Objective: attrition score (see
  Scoring). Signature buff **Royal Road** — once per turn, redeploy one defender
  between two Persia-held cities linked by the road network at reduced/zero
  movement cost, letting a single army cover a wide front. Unique unit hook:
  Immortals.

### Scoring (per-faction)
- **Macedon:** `score = Σ value(capturedCities)` at deadline.
- **Persia:** `score = Σ weight(destroyedMacedonianUnits) + Σ value(citiesHeld)`
  at deadline.
- **Two separate leaderboards** (one per faction); never cross-compared.
- Tie-breakers TBD.

---

## 6. Intent / contract

```ts
type Intent =
  | { kind: "moveUnit"; unitId: string; to: Hex }
  | { kind: "attack"; unitId: string; target: Hex }
  | { kind: "endTurn" };

type SubmitResult =
  | { ok: true; view: MatchView }            // authoritative, post-AI
  | { ok: false; reason: "illegal" | "not-your-turn" | "stale" | "finished" };
```

The server is the only authority on whether an intent is legal.

---

## 7. AI opponent
- Pure, **seeded**, server-side. v0: greedy heuristic (garrison defends; nearby
  enemy units move toward weakest adjacent Macedonian unit). Personality as
  data so it's tunable. Deterministic given seed → reproducible & testable.

---

## 8. Conventions
- Strict TypeScript, no `any`. ESM. Compartmentalized modules + CSS.
- All functionality test-covered; engine gets exhaustive pure unit tests;
  one full-flow integration test mounts a match and plays a short sequence.
- i18n-ready strings; accessible hex board (keyboard navigation + ARIA) —
  design questions to be raised before the board UI PR.

---

## 9. First-PR slice & roadmap

Each PR keeps **app-code changes under ~150 lines** (excl. tests/CSS/config),
per repo policy. Proposed sequence:

1. **Repo + skeleton** — Next.js app, TS strict config, test runner, CI, this doc.
2. **Engine core (no UI)** — types for `Hex`, `Unit`, `MatchState`; `createMatch(seed)`;
   pure `applyIntent`; seeded RNG. Exhaustive unit tests. *No rendering.*
3. **Persistence + Server Action** — Postgres adapter, `submitIntent` with auth,
   optimistic concurrency, idempotency.
4. **Hex board rendering (RSC)** — render authoritative state; design Q&A first.
5. **Movement & combat UI** — wire intents to the board.
6. **AI phase** — seeded greedy AI on End Turn.
7. **Deadline, scoring, leaderboard** (Macedon board first).
8. **Alexander abilities** (Fusion, no war-weariness) as data-driven effects.

*Phase 2 — Persia + PvP (each its own PR/issue):*

9. **Second faction: Persia/Darius** — faction data, attrition scoring, Royal
   Road, Immortals (data-driven).
10. **PvP foundation** — two human slots in a match; turn-ownership enforcement.
11. **PvP turn handoff & live updates** — waiting player learns it's their turn
    (polling first, SSE later — §10).
12. **Per-viewer rendering / fog isolation** — each human sees only their own
    visible state.
13. **PvP robustness** — turn timers, abandonment/disconnect, per-faction
    leaderboards.

*Cross-cutting foundations & enrichment:*

14. **Content schema + accuracy-validation harness** — typed content entries
    (coordinates / dates / citations) and a CI test suite that rejects
    anachronisms and geographic errors. *Needed as soon as the first map is
    authored (Phase 1).*
15. **Educational media layer** — contextual-unlock cards that link out to
    Tides of History episodes / curated videos; authored media data doubles as
    citations (§10). Enrichment after the core loop renders.

Open follow-ups to file as issues: combat-formula tuning, replay verification,
accessibility pass on the board, map authoring tooling, PvP matchmaking,
initial curated media set, optional set-piece battle mode (Issus/Gaugamela).

---

## 10. Historical accuracy & chronology

Model: **accurate start, divergent play.** The authored historical baseline —
the 336 BC starting state, map, and content — is exact; the campaign may then
diverge (alternate history). Accuracy constraints bind the **data and initial
setup, not the player's emergent outcomes.** Conquering a city "ahead of
schedule" is fine; the world it diverges *from* must be accurate.

- **Provenance on every entry.** Cities, people, battles, units, and events
  carry `{ coordinates?, dates, citations[] }`. Geography is exact and enforced;
  dates are surfaced for education/flavor and are *not* hard gameplay gates.
- **Enforcement = both (per decision):**
  - *Automated* — a content-validation suite in CI rejects anachronisms and
    geographic errors: a unit referenced before its historical introduction, a
    city referenced before its founding, an event dated outside the campaign
    window, coordinates outside plausible bounds, or any entry missing a
    citation.
  - *Manual* — every entry requires a citation; editorial review covers
    interpretive accuracy the tests can't catch.
- **Single source of truth.** Citations are the same URLs the educational layer
  links to (§11), so one dataset serves both accuracy and education.

### Set-piece battle fidelity — Issus & Gaugamela
Two battles get accurate, hand-authored representation. **Approach: hybrid** —
authored **campaign-map** engagements first (terrain and units reproduce the
historical situation), with optional dedicated **set-piece** battlefields for
these marquee fights in a later phase:
- **Issus (333 BC):** a narrow coastal plain pinned between the Amanus
  mountains and the sea, split by the Pinarus River. The defining fact to model
  is that the **constricted frontage caps Persia's numerical advantage** — not
  all units can engage. River as a defensive line; Darius's Greek-mercenary
  center; the Companion charge at Darius's position, and the **king's flight
  triggering an army-wide morale rout**. (This battle is a *major* divergence
  point — see §12.)
- **Gaugamela (331 BC):** an **open plain** Darius leveled for scythed chariots,
  cavalry, and elephants — the deliberate contrast to Issus, where numbers *do*
  tell. Won by maneuver: an oblique advance opens a gap, the Companion wedge
  drives at Darius, who again flees. Scythed chariots are dangerous but
  counterable (gaps / light infantry). Civ 6 models this passably; we refine the
  open-ground-vs-constricted-frontage contrast as the teaching moment.

## 11. Educational layer

- **Surfacing: contextual unlocks.** A game/data event — capturing a notable
  city, the clock reaching a historical date, or a battle at a significant site
  — surfaces a dismissible **media card** relevant to what just happened.
- **Media: link out, optional (per decision).** The card links to the official
  Tides of History episode or a curated video (opens externally,
  `rel="noopener noreferrer"`); it **never gates progress**. No third-party
  embeds — the client stays thin, privacy is preserved, CSP surface stays
  minimal (consistent with §3).
- **Data model.** Media entries are authored data —
  `{ id, title, source, url, citation, triggers[], entityRefs[] }` — and double
  as the §10 accuracy citations. Curation (which media maps to which entity) is
  authored + editorially reviewed.
- **a11y / i18n.** Card copy localized; external-link semantics announced to
  screen readers; respects reduced-motion.

## 12. Divergence points (alternate-history decision nodes)

Per §10 (accurate start, divergent play): each node is grounded in a real
moment from 336–323 BC; the *choice* is where history forks. Authored as data
(`{ id, trigger, options[], effects[], citations[], media[] }`) so nodes are
added/tuned without engine changes, and each carries an educational link (§11).

- **Granicus (334 BC)** — *Persia:* scorched earth (deny supply) vs. pitched
  battle (Memnon's rejected counsel). *Macedon:* reckless crossing
  (Alexander-death risk) vs. cautious crossing.
- **Tyre (332 BC)** — conquer **Old Tyre** (mainland) and **New Tyre** (island).
  Choose the **land bridge** (causeway: slow, exposed) vs. a **navy** (requires
  a captured naval base — unlocked early by taking **Athens**).
- **Darius's peace offer (333–332 BC)** — accept partition (negotiated
  alternate-history ending) vs. press east.
- **Issus (333 BC)** — *Persia:* open ground vs. the narrow coastal field;
  stand vs. flee (morale cost).
- **Egypt & Siwa (332–331 BC)** — consolidate Egypt + found Alexandria (naval
  base) vs. race to Mesopotamia (tempo).
- **Gaugamela (331 BC)** — *Macedon:* night attack vs. dawn battle. *Persia:*
  commit chariots/elephants vs. hold.
- **Persepolis (330 BC)** — burn (vengeance for the 480 BC sack of Athens;
  pleases Greeks, alienates Persians) vs. preserve (legitimate-successor path).
- **Hyphasis (326 BC)** — press east (overextension risk) vs. consolidate;
  map-edge endgame.
- **Bessus's coup (330 BC, Persia)** — trust satraps vs. purge usurpers
  (internal stability).

## 13. Faction mechanics catalog (data-driven, phased)

Authored as faction/unit/effect data behind the registry (§5). **Most depend on
systems beyond the MVP** (siege equipment, wonders, great generals, unit
maintenance/economy, unit purchasing) and land in Phase 2+. All randomness is
**server-seeded** (§3), so luck-based effects below are *not* save-scummable.

**Macedon / Alexander**
- Catapults, archers, and cavalry gain **no** benefit from siege towers /
  battering rams (those aid melee siege infantry only).
- Hoplite **adjacency** (phalanx) bonuses apply. *(Adjacency target + magnitude:
  TBD tuning.)*
- **Flanking** mirrors Humankind and uses **unit facing**: each unit has an
  orientation, and an attack lands in the defender's **front / flank / rear**
  arc (rear > flank); the bonus *also* scales with the **number** of flanking
  units.
- **Hypaspists**: no bonus when sieging a city.
- **Hetairoi**: +1 movement while benefiting from a great general.
- Capturing a **wonder-city** with **Alexander adjacent** grants **that city's
  own unique unit** (Hellenistic Fusion); further copies are purchasable
  thereafter at **+50% cost**.

**Persia / Darius**
- **Heavy cavalry**: a **flat per-attack chance** of an **instant kill** (seeded
  server-side, so not save-scummable), offset by **-2 attack strength**.
  (Probability value: tuning.)
- **One** great general only; all units within **2 tiles** have **zero
  maintenance**.
- Units on the **Royal Road** (see naming note) have **zero maintenance**.
- **Immortals**: much lower build cost, but **no new Immortals** may be trained
  while **15** Persian Immortals already exist (echoes Herodotus's fixed-number
  corps).

> Naming note: the doc uses **"Royal Road"** (the historical Achaemenid road
> built under Darius I) for the §5 redeploy buff *and* this maintenance rule —
> "golden road" treated as the same feature pending your confirmation.

## 14. Open questions for review
- Map size / which historical cities to include in the first slice (suggest a
  small 3–4 city vertical slice first).
- Auth: NextAuth/Auth.js session vs. a hand-rolled signed cookie for Phase 1.
- Postgres host preference (Neon vs Supabase vs Vercel Postgres).
- PvP matchmaking: private invite-link vs. open queue (suggest invite-link
  first).
- PvP turn-handoff transport: short polling vs. SSE vs. websockets (suggest
  polling first; SSE upgrade later).
- PvP turn timer / abandonment policy (forfeit after N minutes?).
- Initial curated media set (which Tides of History episodes / videos) and the
  citation schema/format.
- Which anachronism classes to enforce first in the validation harness.
- Balance tuning: flanking magnitudes (rear vs. flank, per-unit), heavy-cav
  instant-kill probability, hoplite-adjacency value, the Immortal cap (15).
