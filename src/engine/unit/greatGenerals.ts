import type { Citation } from "../content/citation";

export interface GeneralAura {
  readonly radius: number;
  readonly defenderStrengthMultiplier: number;
}

export interface GreatGeneral {
  readonly id: string;
  readonly name: string;
  readonly faction: string;
  readonly aura: GeneralAura;
  readonly citation: Citation;
}

export const PARMENION_AURA_RADIUS = 2;
export const PARMENION_DEFENDER_STRENGTH_MULTIPLIER = 1.25;

export const GREAT_GENERALS: Readonly<Record<string, GreatGeneral>> = {
  parmenion: {
    id: "parmenion",
    name: "Parmenion",
    faction: "macedon",
    aura: {
      radius: PARMENION_AURA_RADIUS,
      defenderStrengthMultiplier: PARMENION_DEFENDER_STRENGTH_MULTIPLIER,
    },
    citation: {
      claim:
        "Parmenion, Philip's veteran marshal, held the defensive left wing at the Granicus while Alexander struck with the Companions.",
      source: {
        title: "Arrian, Anabasis of Alexander",
        author: "Arrian",
        work: "Anabasis 1.14",
        url: "http://www.perseus.tufts.edu/hopper/text?doc=Arr.+An.+1.14",
        type: "primary",
      },
      confidence: "high",
    },
  },
};

export function greatGeneralByTypeId(typeId: string): GreatGeneral | undefined {
  return GREAT_GENERALS[typeId];
}
