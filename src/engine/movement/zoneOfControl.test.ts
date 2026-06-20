import { describe, it, expect } from "vitest";
import type { Hex } from "../hex";
import { neighbors } from "../hex";
import { hexKey } from "../map/types";
import type { Unit } from "../unit/types";
import { riverEdgeKey } from "./cost";
import { enemyZoneOfControl } from "./zoneOfControl";

const unit = (id: string, owner: string, hex: Hex, typeId = "warrior"): Unit => ({
  id,
  typeId,
  owner,
  hex,
  hp: 100,
  morale: 80,
  supplied: true,
  hasMovedThisTurn: false,
});

const ENEMY_HEX: Hex = { q: 2, r: 2 };
const [plain, acrossRiver] = neighbors(ENEMY_HEX) as readonly [Hex, Hex, ...Hex[]];
const military = (): boolean => true;
const noRivers: ReadonlySet<string> = new Set();

describe("enemyZoneOfControl", () => {
  it("projects onto an adjacent enemy-controlled hex", () => {
    const zoc = enemyZoneOfControl([unit("e", "persia", ENEMY_HEX)], "macedon", military, noRivers);
    expect(zoc.has(hexKey(plain))).toBe(true);
  });

  it("does not project across a river edge", () => {
    const rivers = new Set([riverEdgeKey(ENEMY_HEX, acrossRiver)]);
    const zoc = enemyZoneOfControl([unit("e", "persia", ENEMY_HEX)], "macedon", military, rivers);
    expect(zoc.has(hexKey(acrossRiver))).toBe(false);
  });

  it("still projects onto non-river neighbors of a unit beside a river", () => {
    const rivers = new Set([riverEdgeKey(ENEMY_HEX, acrossRiver)]);
    const zoc = enemyZoneOfControl([unit("e", "persia", ENEMY_HEX)], "macedon", military, rivers);
    expect(zoc.has(hexKey(plain))).toBe(true);
  });

  it("ignores the viewer's own units", () => {
    const zoc = enemyZoneOfControl(
      [unit("m", "macedon", ENEMY_HEX)],
      "macedon",
      military,
      noRivers,
    );
    expect(zoc.size).toBe(0);
  });

  it("ignores non-military units", () => {
    const zoc = enemyZoneOfControl(
      [unit("e", "persia", ENEMY_HEX)],
      "macedon",
      () => false,
      noRivers,
    );
    expect(zoc.size).toBe(0);
  });
});
