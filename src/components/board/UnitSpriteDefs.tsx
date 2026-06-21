import type { UnitClass } from "@/engine/unit/classes";
import { spriteIdForClass, UNIT_SPRITE_PATHS, UNIT_SPRITE_VIEWBOX } from "./unitSprites";

export function UnitSpriteDefs() {
  const classes = Object.keys(UNIT_SPRITE_PATHS) as UnitClass[];
  return (
    <defs>
      {classes.map((unitClass) => (
        <symbol key={unitClass} id={spriteIdForClass(unitClass)} viewBox={UNIT_SPRITE_VIEWBOX}>
          <path d={UNIT_SPRITE_PATHS[unitClass]} fill="currentColor" />
        </symbol>
      ))}
    </defs>
  );
}
