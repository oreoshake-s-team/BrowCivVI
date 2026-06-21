import { describe, it, expect } from "vitest";
import type { Hex } from "../hex";
import { neighbors } from "../hex";
import { hexKey } from "../map/types";
import type { Unit } from "../unit/types";
import { movementConstraints } from "./constraints";

const PEZHETAIROS = "pezhetairos";
const IMMORTAL = "immortal";
const HETAIROI = "hetairoi";
const PAPHLAGONIAN = "paphlagonian-cavalry";
const PERSIAN_CAVALRY = "persian-cavalry";

const ENEMY_HEX: Hex = { q: 2, r: 2 };
const [CONTROLLED] = neighbors(ENEMY_HEX) as readonly [Hex, ...Hex[]];
const noRivers: ReadonlySet<string> = new Set();

const unit = (id: string, owner: string, typeId: string, hex: Hex): Unit => ({
  id,
  typeId,
  owner,
  hex,
  hp: 100,
  morale: 80,
  supplied: true,
  hasMovedThisTurn: false,
});

function zoneOfControlFor(
  moverTypeId: string,
  moverHex: Hex,
  others: readonly Unit[],
): ReadonlySet<string> {
  const mover = unit("mover", "macedon", moverTypeId, moverHex);
  return movementConstraints([mover, ...others], mover, noRivers).zoneOfControl;
}

describe("movementConstraints zone of control", () => {
  it("halts and locks a melee mover inside an enemy zone of control", () => {
    const enemy = unit("e", "persia", IMMORTAL, ENEMY_HEX);
    const zoc = zoneOfControlFor(PEZHETAIROS, CONTROLLED, [enemy]);
    expect(zoc.has(hexKey(CONTROLLED))).toBe(true);
  });

  it("exempts a heavy cavalry mover from enemy zone of control", () => {
    const enemy = unit("e", "persia", IMMORTAL, ENEMY_HEX);
    const zoc = zoneOfControlFor(HETAIROI, CONTROLLED, [enemy]);
    expect(zoc.size).toBe(0);
  });

  it("exempts a light cavalry mover from enemy zone of control", () => {
    const enemy = unit("e", "persia", IMMORTAL, ENEMY_HEX);
    const zoc = zoneOfControlFor(PAPHLAGONIAN, CONTROLLED, [enemy]);
    expect(zoc.size).toBe(0);
  });

  it("still lets enemy cavalry project a zone of control onto a melee mover", () => {
    const enemyCavalry = unit("e", "persia", PERSIAN_CAVALRY, ENEMY_HEX);
    const zoc = zoneOfControlFor(PEZHETAIROS, CONTROLLED, [enemyCavalry]);
    expect(zoc.has(hexKey(CONTROLLED))).toBe(true);
  });
});
