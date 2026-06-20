# Conquests of Alexander — Design Doc (v0)

> Status: **DRAFT for review**. Scope: the _first_ design — a stripped-down but heavily-moddable core. This doc fixes the architecture and the data model so later changes are additive, not rewrites.

---

## 1. Vision

A browser, turn-based, 4X-_lite_ strategy game themed on Civ 6's **"Conquests of Alexander"** scenario, on a fixed historical hex map, racing a **hard turn limit**. The campaign **opens at the Battle of the Granicus (334 BC)** — Alexander's crossing into Asia Minor — and is won as much by **logistics (supply) and morale** as by battle: neglect either and an army can collapse without losing a fight. Two **asymmetric playable factions** (see §5):

- **Macedon / Alexander** — offense: conquer-by-deadline score.
- **Persia / Darius** — defense: attrition score (Macedonian units destroyed + cities held).

Playable **solo vs AI** or **human-vs-human (PvP)**. Final scores land on **separate per-faction leaderboards**.

We deliberately drop _eXplore_ (the map is authored and fully known) and _settler-style eXpand_ (no founding new cities on a fixed historical map). The game centers on **eXterminate + eXpand**: cities are won both by **conquest** and by **loyal defection** (§5) — on a known map, with a fixed starting army, racing the clock. (A thin layer of **eXploit** — terrain, flanking, and logistics like the Royal Road — sits underneath, with economy arriving in later phases.)

### Scope & phasing

- **Phase 1 (MVP) — solo vs AI as Alexander** (offense). Proves the server-authoritative architecture end-to-end with a single faction flow.
- **Phase 2 — solo vs AI as Darius** (defense / attrition). Adds the second asymmetric faction and the AI playing the _aggressor_ side.
- **Phase 3 — PvP** (human Macedon vs human Persia). The data model carries **two player slots** and **per-viewer rendering** from day one, so PvP is additive, not a rewrite.
- Cross-cutting (phased in alongside the above, details in §10–§11): **historical-accuracy constraints** on all content data, and an **educational media layer**.
- Out of scope for now: districts, tech tree, diplomacy, economy beyond conquest/attrition needs; procedural maps (the map is authored data).

---

## 2. First principles

1. **The client is untrusted and near-stateless.** It renders authoritative state and collects _intents_. It never computes outcomes. (This is the whole genesis of the project — see §4.)
2. **State lives on the server.** The browser holds only what the server last sent it.
3. **Content is data; rules are pure engines.** Units, terrain, city values, AI personalities, Alexander's bonuses — all authored as typed data. The engine is a pure function `(state, intent) -> state`. "Highly modified" becomes "edit a data file," not "rewrite the engine."
4. **Determinism.** Given a match seed + the ordered action log, the entire game is reproducible. This underpins both testing and anti-cheat (§3).

---

## 3. Threat model & integrity (why server-authoritative)

The player fully controls their browser, DevTools, and network. We do **not** try to stop that. Instead:

| Asset to protect                  | Attack                                                     | Defense                                                                                                                                                      |
| --------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Leaderboard score                 | Client submits a fake score                                | Client **cannot** submit scores. Score is _derived_ server-side from the authoritative state at the deadline.                                                |
| Match legitimacy                  | Client forges a result ("I captured Babylon")              | Client sends only **intents**; server validates legality and computes the result.                                                                            |
| Save-scumming RNG                 | Retrying an action until combat RNG is favorable           | All randomness is derived server-side from a **secret per-match seed + turn counter**. The same action always resolves the same way; retrying gains nothing. |
| Replay / double-submit            | Re-sending a captured request                              | Each action carries an **idempotency key** and a **state version**; stale/duplicate versions are rejected (optimistic concurrency).                          |
| Session hijack / impersonation    | Acting as another player                                   | Short-lived session (JWT or framework session cookie) identifies the player; ownership checked on every action.                                              |
| Inspecting hidden info            | Reading AI plans / fog-of-war from network                 | Hidden state is **never sent** to the client until revealed.                                                                                                 |
| Peeking at a human opponent (PvP) | Reading the other player's units/plans off your own client | Server renders **per-viewer**: each response contains only what _that_ faction can see. The opponent's hidden state never leaves the server.                 |
| Acting out of turn (PvP)          | Submitting intents when it isn't your turn                 | Server enforces **turn ownership**: intents from the non-active slot are rejected.                                                                           |
| City defection / loyalty          | Client claims a city flipped to it                         | Loyalty pressure and defection are computed **server-side** in the pure engine; the client only sends an `incite` intent, never a result.                    |

> With PvP, _both_ players are mutually untrusted adversaries — the server-authoritative model is doing its most important work here, not just guarding a leaderboard.
>
> JWT's role: authentication of _who_ is acting, plus short expiry to bound replay. It is **not** a place to store trusted game state.

Optional later: persist the full action log so any leaderboard entry can be **re-simulated** server-side for verification.

---

## 4. Architecture

```text
Browser (RSC + minimal client islands)
  │  user clicks a hex / unit / "End Turn"
  ▼
Server Action     submitIntent(matchId, intent, version, idempotencyKey)
  │  1. authenticate (session) → playerId
  │  2. load authoritative MatchState from DB (with version)
  │  3. validate intent against rules engine
  │  4. apply: state' = engine(state, intent)   [pure]
  │  5. run AI turn if End-Turn → state''        [pure, seeded]
  │  6. persist state'' with version+1 (optimistic lock)
  ▼  7. return the requesting player's authoritative view
Browser re-renders authoritative view
```

- **Next.js App Router** on **Vercel** (serverless functions).
- **Typed Next.js Server Actions are the client–server contract** (hard requirement, §8). The intent channel is the `submitIntent` Server Action, and per-viewer authoritative state is returned by Server Actions; PvP turn-handoff/live updates use a transport chosen when PvP lands (polling/SSE/websockets TBD, §14). There are **no ad-hoc REST/JSON endpoints** for game state, and the client still only _sends intents and reads authoritative state_, never computing outcomes (§2/§3).
- The **rules engine** is a framework-agnostic pure TS module (`/engine`), trivially unit-testable with no Next.js in scope; the Server Actions call the engine, they never contain rules.

### Persistence

The engine never imports a database. All storage sits behind one interface so the storage engine is reversible and the pure engine stays testable:

```ts
interface MatchStore {
  load(id: MatchId): Promise<{ state: MatchState; version: number } | null>;
  save(id: MatchId, state: MatchState, expectedVersion: number): Promise<void>; // throws on version mismatch
}
```

- First impl: **in-memory** (tests, local dev). Real impl swapped in later with no engine changes.
- Default real store: **Postgres + `JSONB`** — _not_ a `TEXT` dump. The match aggregate is stored as a binary, indexable `JSONB` column; the **schema is enforced in TypeScript** at the read/write boundary (parser, e.g. Zod) and versioned with the code.
- **Evolving model strategy:** every stored aggregate carries a `schemaVersion`; shape changes are a TS type edit + an **upcaster** (`migrate(old) -> current`) run on read. No SQL migration for state-shape changes. (This technique is identical for a document DB — so an evolving model is _not_ itself a reason to prefer one engine over the other.)
- Why relational over a document DB despite the evolving state: the **leaderboard** (sort/rank/aggregate/uniqueness) and the **optimistic-concurrency anti-replay** defense (§3) are relational sweet spots, and we avoid running a second datastore.
- Tables (sketch): `matches(id, player_id, seed, status, turn, version, schema_version, state_jsonb, created_at)`, `leaderboard(match_id, player_id, score, finished_at)`.
- Local dev: in-memory store or Postgres via Docker/Neon branch (avoid SQLite↔Postgres drift now that state is JSONB).

### Match & players

- A match has up to **two slots** (`macedon`, `persia`); each slot is a human `playerId` or `ai`. Solo = one human + one AI; PvP = two humans.
- The active slot is authoritative state; **only the active player's intents are accepted** (turn ownership, §3).
- **Per-viewer rendering:** the Server Action builds the response from the _requesting_ player's visibility, so a human never receives the opponent's hidden state. The AI "sees" only inside the engine, server-side.
- **Turn handoff (PvP):** when a player ends their turn, the waiting player is notified it's their turn via the live-update transport chosen for PvP (§14).

---

## 5. Game model (v0)

### Map

- **Hex grid** using axial coordinates `{q, r}`. Authored as data.
- Each hex has a **terrain type** carrying `{ moveCost, defenseModifier, passableBy }`, where `passableBy` lists the movement domains that may enter the hex: `land`, `naval`, or both.
- **Non-traversable terrain.** `mountain` and `deepSea` are impassable (`passableBy: []`) — they block movement and **channel** armies along the open ground between them (directly models Issus, pinned between the Amanus mountains and the sea), and wall off the map edge.
- **Movement penalties.** `moveCost` makes rough terrain (hills, marsh, desert) cost more of a unit's movement budget; a unit may only enter a hex it can still afford. Impassable hexes can never be entered.
- **Rivers are edge features.** A (non-navigable) river runs along the **edge between two hexes**. Crossing a river edge costs **extra movement** and imposes a **combat penalty on the attacker / bonus to the defender** across it — the river as a defensive line (Granicus, the Pinarus at Issus). Authored as a set of bordered edges, not as hex contents.
- **Navigable rivers** _are_ in this version. A navigable river is a **water corridor** (the Tigris, Euphrates, Nile) authored as `naval`-passable hexes: ships move **along** it as a fast lane, while land units crossing it still pay the river-crossing penalty above. Naval movement is bounded to coastline and navigable rivers (no open-`deepSea` traversal in v0), keeping the navy historically coastal and feeding Tyre's causeway-vs-navy choice (§12). The map model represents the `naval` domain now; naval _units_ arrive with the Tyre/Athens content (§12). When a land unit enters a navigable river, their turn is ended. On the next turn, they can move one tile more than their land movement allows and they can disembark onto land as long as they have movement left. Attacking while embarked carries a pentalty.
- Cities are hexes flagged `city` with an owner, `value` (leaderboard weight, reduced if sacked or scorched — see Scoring / §13), and defense strength.

### Units

- Data-driven `UnitType` (e.g. Hetairoi cavalry, Hypaspist, generic enemy garrison): `{ id, name, class, movement, strength, capabilities[], abilities[] }`. Two orthogonal axes describe a unit:
  - **`class`** — _what the unit is_, a Civ 6 promotion class: `civilian · recon · melee · ranged · antiCavalry · lightCavalry · heavyCavalry · siege · navalMelee · navalRanged · navalRaider · support`. The `class` also **derives the movement `domain`** (`land` / `naval`) that gates which hexes it may enter (see Map) — the naval classes are the only `naval`-domain units, so domain is computed from class, not stored twice.
  - **`capabilities[]`** — _what the unit can do_: `move · meleeAttack · rangedAttack · bombard · settle · siegeSupport · heal`. Effective capabilities are the union of three layers: a **universal** set every unit shares (`move`, `heal` — all units may move and all units may heal), the **class** set (e.g. `melee → [meleeAttack]`, `ranged → [rangedAttack]`, `siege → [bombard]`), and any **extra** capabilities a `UnitType` lists to specialise it (e.g. a settler is `class: civilian` + `[settle]`; a siege-tower is `class: support` + `[siegeSupport]`). The server turns a unit's effective capabilities into the **legal intents** (§6) it surfaces — capabilities map to intent kinds (`move → moveUnit`, `meleeAttack/rangedAttack/bombard → attack`, `settle → settle`), while passive capabilities (`siegeSupport`, `heal`) authorise no active intent. `heal` is **passive recovery** (resolved by the turn / Supply & morale pass, §5), not an order; whether healing is gated on friendly/supplied territory or ever becomes an active "rest" intent is deferred to the supply/morale slice.
  - **`abilities[]`** stays distinct: it holds combat/effect **modifiers** (`phalanx`, flanking, instant-kill — §13) resolved behind the effect registry, _not_ actions. "Can act" (capabilities) and "gets a bonus" (abilities) are kept separate.
- A `Unit` instance: `{ id, typeId, owner, hex, hp, morale, supplied, hasMovedThisTurn }`. `morale` and `supplied` feed the Supply & morale system below. Units have **no facing** — flanking is positional (a pincer), not orientation-based (§13).

### Turn structure

- `turn` counter with a fixed `turnLimit`.
- Player phase → "End Turn" → server resolves **AI phase** → next turn.
- At `turn === turnLimit`, match is `finished`; score is computed and written to the leaderboard.

### Run structure (roguelite framing)

A match is a **seeded run**, not a persistent save: deterministic from its secret seed (§3), bounded by the turn limit, and scored to a leaderboard. Replayability comes from seed + divergence-node choices + seeded events (e.g. Bessus) + the opponent — **not** procedural generation: the historical map is always authored (§10). So it is a **strategy roguelite**, with two guardrails:

- **No procedural map** — accuracy is fixed; only the playthrough varies.
- **No _power_ meta-progression** — it would corrupt leaderboard comparability (§3). Meta-progression is **knowledge/cosmetic only**: the educational media cards you unlock (§11) and a log of which divergence endings you've reached.

The post-game seed is shown for sharing and feeds the §3 replay-verification idea.

**Mutators (unlockable "Civ 6 bugs").** Optional, opt-in run modifiers — think relics / daily mutators — re-create infamous Civ 6 quirks for fun (e.g. _Improper Siege Support_, §13). To protect the guardrail above, mutator runs are **flagged and ranked on a separate leaderboard lane**; the canonical per-faction boards only count clean, mutator-free runs. Unlocking a mutator is knowledge/cosmetic progression, not a power edge on the real boards.

### Combat (stripped-down, modular)

- Resolve via a **pure, seeded `resolveCombat`** (`rng` is the match's seeded stream). v0 formula follows Civ 6: HP damage scales **exponentially with the combat-strength difference** — `damage = round(30 · e^(0.04·(atkStr − defStr)) · variance)`, clamped to `[1, defender.hp]`, with `variance` a seeded `±25%` factor. The attacker's effective strength gains the **pincer flank bonus** when the defender is flanked (§13); the defender's effective strength is multiplied by its **terrain `defenseModifier`** and its ability modifiers behind the registry (the **phalanx wall**, negated when flanked, reduced on rough ground — §13). Both sides' phalanx units also gain the **formation-adjacency** bonus (+10%/adjacent same-formation ally, cap +30%, §13). Melee is bidirectional (the attacker takes a seeded counter); `attackerDamage`/`defenderDamage` and the `defeated` flags are returned for the server to apply. Morale and the river-crossing penalty feed in later. The _formula is a swappable module_ so we can tune toward / away from Civ 6's combat math freely.

### Supply & morale

Two coupled systems, both **pure per-turn engine passes** (server-authoritative, content-as-data, tunable) — and both **devastating if neglected**.

**Supply.** Supply flows from **supply sources** (controlled cities, the home base, captured naval bases + the fleet, the Royal Road network) outward through friendly/controlled hexes; impassable terrain, rivers, and enemy-held ground break the line. A unit **out of supply** (cut off, or pushed too far beyond a source) takes escalating **attrition** (HP/strength loss) and bleeds **morale**. This is where **Memnon's scorched earth** (§13) bites (burned hexes deny supply), and where **navigable rivers / naval bases** (Tigris, Euphrates, Nile; the fleet) and the **Royal Road** act as supply arteries. Overextension by pure conquest stretches supply thin; consolidating **loyal** territory secures it — another nudge toward eXpand.

**Morale.** Each unit has **morale**, raised by victories and nearby leadership (a **great general** / Alexander), lowered by losses, being **flanked / rear-hit** (§13), going **out of supply**, and **war-weariness** from overextension and distance from home. Low morale weakens units and can trigger a **rout** (flee / refuse orders); a **leader's death or flight** craters morale army-wide — the mechanism behind the **king's-flight rout** at Issus/Gaugamela (§10/§12) and the **Hyphasis mutiny** (§12). Alexander's **"To the World's End"** (no war-weariness, §13) is the systemic counter.

Both resolve **server-side** in the pure engine (§3); the client only sees the result. Thresholds/rates are authored data, so harshness is tunable (§14).

### Factions (asymmetric, data-driven)

A `Faction` is authored data — `{ id, leader, objective, abilities[], uniqueUnits[] }` — so new sides and tuning are data edits, not engine changes. Objective/ability effects are pure modules behind a registry; stubs return identity so the engine stays green before each is implemented.

- **Macedon / Alexander — offense.** Objective: conquer-by-deadline score. Abilities (hooks now, effects later): "To the World's End" (no war-weariness), "Hellenistic Fusion" (capture bonus). Unique units: Hetairoi, Hypaspist.
- **Persia / Darius — defense (attrition).** Objective: attrition score (see Scoring). Signature buff **Royal Road** — once per turn, redeploy one defender between two Persia-held cities linked by the road network at reduced/zero movement cost, letting a single army cover a wide front. Unique unit hook: Immortals. When playing as Persia, Alexander is known as "Alexander the Accursed" and not "Alexander the Great."

### Loyalty & defection (peaceful expansion)

Cities are won **three** ways: **conquest** (combat), **loyal defection** (no battle), or **founding** a new city with a settler (the `settle` intent, §6). Founding is a **Macedon-flavored** acquisition path — historically grounded in the ~20 cities Alexander founded across the campaign (Alexandria-in-Egypt, 331 BC; Alexandria Eschate on the Jaxartes — Arrian, _Anabasis_ III.1, IV.4). A founded city enters owned by its founder with loyalty seeded toward that faction and a low starting `value` that grows as it is held; Persia does not settle, expanding only by holding and scorching. (Founding sits within §10's "accurate start, divergent play": the authored 334 BC map is fixed, but a divergent run may plant new Alexandrias.) Each city carries a **loyalty** meter pulled between the two factions, updated each turn by a pure engine pass from:

- **proximity** to each side's held cities and units,
- **legitimacy / momentum** — recent captures, holding a faction's anchor cities, and leader presence (a routed king craters his side's legitimacy — ties to the Issus/Gaugamela flight nodes, §12),
- authored **cultural / ethnic affinity** per city (Greek cities lean Macedon, the Persian heartland leans Darius — §10 accuracy data).

When net pressure crosses a threshold the city **defects bloodlessly** — a plain ownership flip, no combat, no unit loss. This is the eXpand acquisition path alongside conquest.

**Under-threat freeze.** A city adjacent to or besieged by an enemy combat unit will **not** peacefully defect — coercion isn't conversion. The incumbent can therefore _garrison or threaten_ a wavering city to hold it (the Royal Road, §5/§13, exists partly to rush a garrison to one about to flip), forcing the aggressor to either pull the threat back and win it over (eXpand) or storm it (eXterminate). This is the Hannibal lesson — battlefield dominance ≠ political control while the incumbent can still reach and punish waverers.

**Driving it.** Beyond emergent pressure, the active player may spend an `incite` intent (§6) to apply pressure / open negotiations with a specific city. Defection itself is always resolved **server-side** in the pure engine (§3) — the client never asserts a flip.

### Scoring (per-faction)

- **Macedon:** `score = Σ value(cities Macedon holds at deadline)`, where each city's contribution scales with its condition: won by **defection** → **full** value; **taken by force** → **sacked** (reduced); **scorched** by the defender (§13) → reduced further. Intact > stormed — the lever that rewards eXpand over pure eXterminate.
- **Persia:** `score = Σ weight(destroyedMacedonianUnits) + Σ value(citiesHeld)` at deadline. Scorched earth trades a city's value for attrition + denied expansion, so Persia weighs burning the land against the loyalty it costs.
- **Two separate leaderboards** (one per faction); never cross-compared.
- Tie-breakers TBD.

---

## 6. Intent / contract

```ts
type Intent =
  | { kind: "moveUnit"; unitId: string; to: Hex }
  | { kind: "attack"; unitId: string; target: Hex }
  | { kind: "settle"; unitId: string } // found a city with a settler (§5, Macedon)
  | { kind: "incite"; cityId: string } // apply loyalty pressure / negotiate (§5)
  | { kind: "scorch"; hex: Hex } // Persia scorched earth (§13)
  | { kind: "endTurn" };

type SubmitResult =
  | { ok: true; view: MatchView } // authoritative, post-AI
  | {
      ok: false;
      reason:
        | "illegal"
        | "not-your-turn"
        | "stale"
        | "finished"
        | "under-threat";
    };
```

The server is the only authority on whether an intent is legal. `incite` is rejected `under-threat` when the target city is being threatened (the §5 freeze); `scorch` is legal only on a controlled, unthreatened hex. This contract is exposed via the **Server Action** intent channel (§4): `Intent` as input, `SubmitResult` / `MatchView` as the typed result, with `MatchView` resolved **per-viewer** (§3).

---

## 7. AI opponent

- Pure, **seeded**, server-side. v0: greedy heuristic (garrison defends; nearby enemy units move toward weakest adjacent Macedonian unit). Personality as data so it's tunable. Deterministic given seed → reproducible & testable.
- As Darius (defense), the heuristic also weighs **garrisoning wavering cities** to freeze defections (§5) and **scorched earth** (§13) when the loyalty cost is worth the attrition.

---

## 8. Conventions

- Strict TypeScript, no `any`. ESM. Compartmentalized modules + CSS.
- **Typed Next.js Server Actions are the client–server contract** (§4): intents and authoritative per-viewer state both flow through typed Server Actions. No ad-hoc REST/JSON endpoints for game state.
- All functionality test-covered; engine gets exhaustive pure unit tests; one full-flow integration test mounts a match and plays a short sequence.
- i18n-ready strings; accessible hex board (keyboard navigation + ARIA) — design questions to be raised before the board UI PR.

---

## 9. First-PR slice & roadmap

Each PR keeps **app-code changes under ~300 lines** (`src/` `.ts`/`.tsx`; excl. tests/CSS/config/tooling/generated/docs), per repo policy. Proposed sequence:

1. **Repo + skeleton** — Next.js app, TS strict config, test runner, CI, this doc.
2. **Engine core (no UI)** — types for `Hex`, `Unit`, `MatchState`; `createMatch(seed)`; pure `applyIntent`; seeded RNG. Exhaustive unit tests. _No rendering._
3. **Persistence + Server Action** — Postgres adapter, `submitIntent` with auth, optimistic concurrency, idempotency.
4. **Hex board rendering (RSC)** — render authoritative state; design Q&A first.
5. **Movement & combat UI** — wire intents to the board.
6. **AI phase** — seeded greedy AI on End Turn.
7. **Deadline, scoring, leaderboard** (Macedon board first).
8. **Alexander abilities** (Fusion, no war-weariness) as data-driven effects.

_Phase 2 — Persia + PvP (each its own PR/issue):_

9. **Second faction: Persia/Darius** — faction data, attrition scoring, Royal Road, Immortals, and **scorched earth** (Memnon's counsel — §12), all data-driven.
10. **Loyalty & defection** — per-city loyalty meter and pressure (proximity, momentum, affinity); bloodless defection as the eXpand path; the under-threat freeze; the `incite` intent (§6); sack/scorch value penalties in scoring (§5). Depends on the authored map + cities.
11. **Supply & morale** — two pure per-turn passes (supply propagation from sources; morale from supply/combat/leadership/war-weariness) feeding attrition and combat (§5). Lands as ≥2 slices (supply first, then morale). Depends on the authored map + cities.
12. **PvP foundation** — two human slots in a match; turn-ownership enforcement.
13. **PvP turn handoff & live updates** — the live-update transport (§14) pushes the waiting player their turn.
14. **Per-viewer rendering / fog isolation** — each human sees only their own visible state.
15. **PvP robustness** — turn timers, abandonment/disconnect, per-faction leaderboards.

_Cross-cutting foundations & enrichment:_

16. **Content schema + accuracy-validation harness** — typed content entries (coordinates / dates / citations) and a CI test suite that rejects anachronisms and geographic errors. _Needed as soon as the first map is authored (Phase 1)._
17. **Educational media layer** — contextual-unlock cards that link out to Tides of History episodes / curated videos; authored media data doubles as citations (§10). Enrichment after the core loop renders.

Open follow-ups to file as issues: combat-formula tuning, replay verification, accessibility pass on the board, map authoring tooling, PvP matchmaking, initial curated media set, optional set-piece battle mode (Issus/Gaugamela).

---

## 10. Historical accuracy & chronology

Model: **accurate start, divergent play.** The authored historical baseline — the **334 BC opening at the Granicus** (Alexander's army crossing the Hellespont into Asia Minor; the Persian satraps and Memnon's Greek mercenaries arrayed behind the river — Darius is not yet personally in the field), the map, and content — is exact; the campaign may then diverge (alternate history). Accuracy constraints bind the **data and initial setup, not the player's emergent outcomes.** Conquering a city "ahead of schedule" is fine; the world it diverges _from_ must be accurate.

- **Provenance on every entry.** Cities, people, battles, units, and events carry `{ coordinates?, dates, citations[] }`. Geography is exact and enforced; dates are surfaced for education/flavor and are _not_ hard gameplay gates.
- **Enforcement = both (per decision):**
  - _Automated_ — a content-validation suite in CI rejects anachronisms and geographic errors: a unit referenced before its historical introduction, a city referenced before its founding, an event dated outside the campaign window, coordinates outside plausible bounds, or any entry missing a citation.
  - _Manual_ — every entry requires a citation; editorial review covers interpretive accuracy the tests can't catch.
- **Single source of truth.** Citations are the same URLs the educational layer links to (§11), so one dataset serves both accuracy and education.

### Balanced perspective — Darius is not a villain

Both factions are protagonists of their own campaign (mirrored objectives, **separate leaderboards**, §5); the content must reflect that:

- **Two valid causes.** Darius defends a legitimate, sophisticated empire against an invader; frame his choices (defense-in-depth, the satraps' dilemma at Granicus, standing at Gaugamela) as **reasonable strategy**, not cowardice or decadence.
- **Source criticism.** The surviving narratives (Arrian, Plutarch, Diodorus, Curtius) descend from **pro-Macedonian** sources (Ptolemy, Aristobulus, Callisthenes); flag that bias in media cards and **seek Achaemenid/Persian-perspective sources** to balance it.
- **No orientalist tropes.** Avoid "effete/despotic East vs. heroic West"; show Persian administration, tolerance, and military competence.
- **Flight is morale, not character.** The king's-flight rout (§5/§10) is a command-and-morale mechanic — present it as such, not personal cowardice.
- **Atrocities cut both ways.** Surface Macedonian brutality too (Thebes, Tyre, Gaza, Persepolis, the Branchidae) so the player isn't handed a sanitized hero.

Enforced by the §10 editorial review, not the automated harness.

### Set-piece battle fidelity — Issus & Gaugamela

Two battles get accurate, hand-authored representation. **Approach: hybrid** — authored **campaign-map** engagements first (terrain and units reproduce the historical situation), with optional dedicated **set-piece** battlefields for these marquee fights in a later phase:

- **Granicus (334 BC):** the campaign's **opening** engagement and turn-1 situation — a **river-line crossing** on the campaign map (river-edge penalty + defender bonus, §5). It opens _in medias res_: both armies start in their **historical deployment** at the river with **no pre-battle repositioning/deployment phase** — you fight from where history placed you. The Persian side is the **satraps + Memnon's Greek mercenaries** (Darius is absent — he first takes the field at Issus). First divergence node (§12).
- **Issus (333 BC):** a narrow coastal plain pinned between the Amanus mountains and the sea, split by the Pinarus River. The defining fact to model is that the **constricted frontage caps Persia's numerical advantage** — not all units can engage. River as a defensive line; Darius's Greek-mercenary center; the Companion charge at Darius's position, and the **king's flight triggering an army-wide morale rout**. (This battle is a _major_ divergence point — see §12.)
- **Gaugamela (331 BC):** an **open plain** Darius leveled for scythed chariots, cavalry, and elephants — the deliberate contrast to Issus, where numbers _do_ tell. Won by maneuver: an oblique advance opens a gap, the Companion wedge drives at Darius, who again flees. Scythed chariots are dangerous but counterable (gaps / light infantry). Civ 6 models this passably; we refine the open-ground-vs-constricted-frontage contrast as the teaching moment.

## 11. Educational layer

- **Surfacing: contextual unlocks.** A game/data event — capturing a notable city, the clock reaching a historical date, or a battle at a significant site — surfaces a dismissible **media card** relevant to what just happened.
- **Media: link out, optional (per decision).** The card links to the official Tides of History episode or a curated video (opens externally, `rel="noopener noreferrer"`); it **never gates progress**. No third-party embeds — the client stays thin, privacy is preserved, CSP surface stays minimal (consistent with §3).
- **Curated starting set (Tides of History).** Verified episodes seeding the media data and §10 citations (exact trigger mapping pending editorial review):
  - _Alexander the Great Invades Persia_ (the 334 BC invasion under Darius III) → the **Granicus** opening — <https://open.spotify.com/episode/0ZWSBCirAa9gajYNw9hdQ8> , <https://podcasts.apple.com/us/podcast/alexander-the-great-invades-persia/id1257202425?i=1000668353388>
    - _Curated video:_ _Battle of Granicus 334 BC — Alexander's Conquests_ (Kings and Generals, animated documentary) → the **Granicus** opening — <https://www.youtube.com/watch?v=s40yYSWkrzk> (secondary source; verify claims before relying on it as a hard citation)
  - _Issus, Gaugamela, and Alexander's Conquest of Persia_ → the **Issus** and **Gaugamela** nodes — <https://open.spotify.com/episode/1hyzYmdIsEVOI72nNUZwOM>
  - _Alexander the Great: Soldier, Priest, and God_ (with Fred Naiden) and _Alexander the Great with Patrick Wyman_ → general background — <https://podcasts.apple.com/us/podcast/alexander-the-great-soldier-priest-and-god/id1257202425?i=1000673355560> , <https://podcasts.apple.com/us/podcast/alexander-the-great-with-patrick-wyman/id1800530353?i=1000718829309>
  - _Still needed for balance (§10): an Achaemenid/Persian-perspective source (e.g. the History of Persia podcast) — to be verified before inclusion._
- **Data model.** Media entries are authored data — `{ id, title, source, url, citation, triggers[], entityRefs[] }` — and double as the §10 accuracy citations. Curation (which media maps to which entity) is authored + editorially reviewed.
- **a11y / i18n.** Card copy localized; external-link semantics announced to screen readers; respects reduced-motion.

## 12. Divergence points (alternate-history decision nodes)

Per §10 (accurate start, divergent play): each node is grounded in a real moment from 334–323 BC; for most, the _choice_ is where history forks. Authored as data (`{ id, trigger, options[], effects[], citations[], media[] }`) so nodes are added/tuned without engine changes, and each carries an educational link (§11). A few nodes are instead **seeded events** with no player choice (no `options[]`, just `effects[]`), resolved server-side from the match seed (§3) so they can't be save-scummed.

- **Granicus (334 BC)** — _the game's opening situation (turn 1), fought from a fixed historical deployment (no repositioning); the Persian side here is the satraps + Memnon, not Darius (who first fights at Issus)._ _Persia:_ **scorched earth** (Memnon's counsel — burn the land to deny Alexander supply: imposes attrition on advancing Macedonian units and lowers the value of cities he takes, _but_ devastating one's own satrapies **erodes loyalty and invites defections** — §5/§13) vs. pitched battle (the satraps' historical choice — they rejected Memnon and lost). _Macedon:_ reckless crossing vs. cautious crossing — but a reckless Alexander who would fall is **saved by Cleitus the Black** (a scripted rescue, exactly as in 334 BC): a near-death morale beat, not a game-over.
- **Tyre (332 BC)** — conquer **Old Tyre** (mainland) and **New Tyre** (island). Choose the **land bridge** (causeway: slow, exposed) vs. a **navy** (requires a captured naval base — unlocked early by taking **Athens**).
- **Darius's peace offer (333–332 BC)** — accept partition (negotiated alternate-history ending) vs. press east.
- **Issus (333 BC)** — _Persia:_ open ground vs. the narrow coastal field; stand vs. flee (morale cost).
- **Egypt & Siwa (332–331 BC)** — consolidate Egypt + found Alexandria (naval base) vs. race to Mesopotamia (tempo).
- **Gaugamela (331 BC)** — _Macedon:_ night attack vs. dawn battle. _Persia:_ commit chariots/elephants vs. hold.
- **Persepolis (330 BC)** — burn (vengeance for the 480 BC sack of Athens; pleases Greeks, alienates Persians) vs. preserve (legitimate-successor path).
- **Roxana (327 BC, Macedon)** — after taking the Sogdian Rock in rebellious Bactria–Sogdiana, **marry Roxana** (daughter of the baron Oxyartes): a large, localized **loyalty swing** that pacifies the east (cities flip / stop revolting; eastern attrition drops — §5) — vs. **rule by force** (garrison and suppress; you hold ground but the east stays restive). The trade-off is historical: the marriage/fusion policy **buys eastern loyalty at the cost of legitimacy with the Macedonian-Greek old guard** ("going native" — proskynesis, the pages' conspiracy), echoing the Persepolis burn-vs-preserve tension. A Macedon-only lever; ties to Hellenistic Fusion (§13). Decision: a **one-shot node** (a persistent eastern-loyalty aura is an optional later add — §14).
- **Hyphasis (326 BC)** — press east (overextension risk) vs. consolidate; map-edge endgame.
- **Bessus (330 BC, Persia)** — a **seeded event, not a choice** (the player can't steer it). After Darius's flight east, one server-seeded roll resolves the Bactrian satrap: **~75% loyal** — he reinforces the eastern satrapies, a **modest, lasting buff** to Persian defense/loyalty — and **~25% coup** — he murders Darius and usurps the throne, a **contained setback** (a one-time legitimacy/loyalty hit, not a collapse). Most games he helps; the betrayal is the rarer, deliberately lesser outcome. Authored with `effects[]`, no `options[]`.

## 13. Faction mechanics catalog (data-driven, phased)

Authored as faction/unit/effect data behind the registry (§5). **Most depend on systems beyond the MVP** (siege equipment, wonders, great generals, unit maintenance/economy, unit purchasing) and land in Phase 2+. All randomness is **server-seeded** (§3), so luck-based effects below are _not_ save-scummable.

### Macedon / Alexander

- Catapults, archers, and cavalry gain **no** benefit from siege towers / battering rams (those aid melee siege infantry only).
  - _Mutator — "Improper Siege Support" (§5):_ the opt-in mutator **inverts** this, letting ranged, cavalry, and bombard units leech ram/tower bonuses (the actual Civ 6 bug). Mutator-lane only; countered by Heated Sand below.
- **Formation adjacency**: a phalanx-formation unit — a **phalangite** (the `phalanx` ability), or a hoplite — gains **+10% combat strength per adjacent friendly same-formation unit, cap +30%** (provisional, §14): the massed sarissa hedge / shield wall reinforced by its neighbours. Applies on **both attack and defence** (distinct from the defensive **sarissa wall** below, which is defender-only).
- **Flanking** is **positional (a pincer)** — there is no unit facing. An attack counts as a flank/rear attack when a unit **allied to the attacker** occupies the hex **directly opposite** the attacker across the defender (`oppositeHex = 2·defender − attacker`): the defender is pinned between two enemies. Flank and rear collapse into a single **flanked** condition. (A later refinement may scale the bonus with the number of such pincers.)
- **Sarissa wall** (phalangite defense): a phalangite (a unit with the `phalanx` ability) presents a hedge of sarissas to its attacker — a strong **defensive** bonus that holds **unless the phalangite is flanked** (pincered, per the rule above), in which case it is **negated** (the formation is taken from two sides). It is also **reduced on rough terrain** (any hex with `moveCost > 1`), where the line loses cohesion. Distinct from the hoplite **adjacency** bonus above (formation density) — the wall is about **encirclement** and **ground**. The historical strength-and-weakness of the Macedonian phalanx: near-unbreakable head-on, fatally exposed once caught from two sides or broken up on uneven ground (the gap at Gaugamela; Arrian, _Anabasis_ III.13–14). Provisional values in §14; a pure modifier behind the combat/effect registry (§5).
- **Hypaspists**: no bonus when sieging a city.
- **Hetairoi**: +1 movement while benefiting from a great general.
- **To the World's End**: immune to **war-weariness** morale decay from overextension/distance (§5 Supply & morale) — the systemic counter to the Hyphasis mutiny.
- Capturing a **wonder-city** with **Alexander adjacent** grants **that city's own unique unit** (Hellenistic Fusion); further copies are purchasable thereafter at **+50% cost**.

### Persia / Darius

- **Heavy cavalry**: a **flat per-attack chance** of an **instant kill** (seeded server-side, so not save-scummable), offset by **-2 attack strength**. Provisional probability **10%** (§14).
- **One** great general only; all units within **2 tiles** have **zero maintenance**.
- Units on the **Royal Road** (see naming note) have **zero maintenance**.
- **Immortals**: much lower build cost, but **no new Immortals** may be trained while **15** Persian Immortals already exist (echoes Herodotus's fixed-number corps).
- **Scorched earth** (Memnon): the active player may `scorch` (§6) a controlled, **unthreatened** region — denies supply (attrition on nearby enemy units) and permanently reduces the value of cities in it, at the cost of **loyalty** (scorched populations drift toward the enemy). Models the strategy the satraps rejected at Granicus (§12).
- **Loyalty suppression:** a garrison or an adjacent army **freezes** a wavering city's defection (the under-threat rule, §5); the Royal Road lets Darius rush a garrison to hold a city about to flip.
- **Heated Sand** (counter-siege sortie): a besieged Persian garrison may sortie to **destroy or disable adjacent enemy siege-support units** (rams/towers). Because the _Improper Siege Support_ mutator routes its bonus **through** those support units, burning them collapses the leeched ranged/cavalry/bombard bonus too — the counter hits the dependency, not the symptom. Historically grounded at the Siege of Tyre (defenders poured red-hot sand and fired the towers); it is Persia's unlockable counter-relic to that mutator.

> Naming note: the doc uses **"Royal Road"** (the historical Achaemenid road built under Darius I) for the §5 redeploy buff _and_ this maintenance rule — "golden road" treated as the same feature pending your confirmation.

## 14. Decisions & open questions

The forks below were resolved in review. **Balance numbers are provisional** — combat is a swappable module (§5) and all thresholds/rates are authored data (§5 Supply & morale), so every value here is tunable after playtest without an engine change.

### Platform & API

- **Auth.** Phase 1 (solo vs AI) uses an **anonymous signed-cookie** identity — enough to own a match. **Auth0** (via `@auth0/nextjs-auth0`, not Auth.js) provides real sign-up / sign-in: login / logout / callback routes are mounted at `/auth/*` by middleware, and a short-lived session resolves to a stable `userId` (the Auth0 `sub`) exposed to server resolvers through a `getUserId()` helper. Auth0 is **additive and auto-enabled** — active only when its env vars are configured (see onboarding/dev-setup); when off, the app stays in anonymous-cookie mode. While enabled, access is **opt-out**: every route except the public home page (`/`) and the `/auth/*` routes requires sign-in (enforced in middleware), and unauthenticated visitors are redirected to Universal Login with a `returnTo`. Still to come: keying **match ownership** on the Auth0 `userId` (the anonymous cookie still owns the match today) with ownership checked on every intent (§3), and **per-`userId` rate-limiting** with configurable, authored limits.
- **Postgres host: Neon** — serverless, Vercel-native, scale-to-zero, with DB branching per preview deploy (pairs with the `JSONB` `MatchStore`, §4). (Vercel Postgres is Neon-backed.)
- **Client–server contract: typed Next.js Server Actions** (no separate API schema layer, no ad-hoc REST). The Server Action signatures and their TypeScript result types _are_ the contract artifact and the trust boundary for the untrusted-client threat model (§3); `tsc` enforces that client and server agree, so there is no separate schema to drift.

### First slice & map

- **First-slice scope: all of Greece + NW Asia Minor through the Granicus crossing** — Macedon's home base eastward across the river to the first cities (Dascylium / Sardis / Ephesus). Widen east in later slices.
- **Mountains & deep sea are strictly impassable** (confirms §5; they channel armies, e.g. Issus).
- **Navigable-river corridors (Tigris / Euphrates / Nile) are _not_ in the first slice** — they lie outside its geography and arrive as the map widens east/south. The first slice's only river feature is the **Granicus** non-navigable crossing edge.
- **Non-navigable river-crossing penalty: +2 movement to cross the edge, −25% attacker strength across it** (≡ +25% defender) — the Granicus/Pinarus defensive line.

### Combat balance (provisional)

- **Damage formula (Civ 6-style):** `round(30 · e^(0.04·Δstrength) · variance)`, clamped to `[1, defender.hp]`; `variance` ∈ `[0.75, 1.25)` seeded. Melee is bidirectional (attacker takes a seeded counter). Base 30, scale 0.04, and the ±25% variance are tunable (swappable module, §5).
- **Flanking (positional pincer): +50%** attacker bonus (and it negates the phalanx wall) when an attacker-allied unit holds the hex directly opposite it across the defender. With no facing, flank and rear are one condition; encirclement and cavalry envelopment are decisive.
- **Persian heavy-cavalry instant-kill: 10% per attack**, offset by the −2 attack strength (§13).
- **Formation adjacency: +10% combat strength per adjacent friendly phalanx-formation unit (phalangite or hoplite), cap +30%** (§13), applied on both attack and defence.
- **Sarissa wall (phalangite): +50% defensive strength while unflanked; bonus negated when flanked (pincered); −25% defensive strength on rough terrain (`moveCost > 1`)** (§13). A pincer both denies the wall _and_ earns the attacker's flank bonus.
- **Immortal cap: 15** (confirms §13).

### Supply & morale

- **Granularity: per-army/region** (not per-unit).
- **Out-of-supply attrition: −10% HP turn 1, +5%/turn, capped at −25%; also bleeds morale.** Cut-off armies bleed over several turns and recover once resupplied.
- **Morale: rout below 25/100; recover +10/turn while supplied and out of combat; a leader's death/flight = −40 morale army-wide** (the Issus/Gaugamela king's-flight collapse, §10/§12).

### Loyalty & scoring

- **Pressure weights: momentum 50 / proximity 30 / affinity 20** on a meter from −100 (Darius) to +100 (Macedon); a city **defects at sustained ±50** (held for one full turn, and not under-threat per §5).
- **City value by condition: defection 100% / sacked 60% / scorched 30%** of base `value` (§5 Scoring).
- **Scorched earth costs −20 region loyalty** (drift toward the enemy).
- **`incite`: one per turn**, targeting a city **within 3 hexes of a friendly unit or city**, with a **2-turn per-city cooldown** and a fixed pressure bump toward the inciting side.

### Events & content

- **Bessus: 25% coup probability.** A loyal Bessus grants a legitimacy/morale boost; the coup costs you Bessus's army and dents Persian legitimacy.
- **Roxana: persistent eastern-loyalty aura** (upgraded from a one-shot node) — while active it raises eastern-city loyalty each turn and drags Greek-base legitimacy each turn.
- **Mutators: _Improper Siege Support_ ships first** (with **Heated Sand** as Persia's counter, §13). Mutator runs are always flagged to a **separate leaderboard lane** — never the canonical per-faction boards.

### Roguelite, educational layer & accuracy harness

- **Meta-progression is knowledge/cosmetic only** (no power carryover, protecting leaderboard comparability, §3). Persisted across runs: **unlocked media cards, divergence endings reached, and unlocked mutators**.
- **Citation schema: a typed `Citation` record on content entries** — `{ claim, source: { title, author, work, url, type }, confidence }` (strict TS, no `any`); machine-checkable and feeds both the media layer and the accuracy harness.
- **Accuracy harness enforces first: geographic exactness (hard errors) + chronological bounds (date flavor-warnings)** (§10).
- **Initial media set: campaign-beat cards** — Granicus, Issus, Gaugamela, the Royal Road, the Siege of Tyre, and Darius III — tied to first-slice beats and divergence nodes.

### Still open

- **PvP turn-handoff transport** (short polling vs. SSE vs. websockets) — deferred until PvP work begins.
- **PvP matchmaking** (private invite-link vs. open queue) — deferred until PvP work begins.
- **PvP turn timer / abandonment** — **Phase 3 v1 ships with no timer**; revisit once real games surface the need.
- **Scoring tie-breakers** (§5) — TBD.
