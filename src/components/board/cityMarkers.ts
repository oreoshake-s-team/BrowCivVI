export const CITY_MARKER_VIEWBOX = "0 0 24 24";

export const CITY_SETTLEMENT_ID = "city-settlement";

const SIGIL_ID_PREFIX = "city-sigil";

export type CityAllegiance = "macedon" | "persia" | "neutral";

export function cityAllegiance(owner: string | null): CityAllegiance {
  if (owner === "macedon") return "macedon";
  if (owner === "persia") return "persia";
  return "neutral";
}

export function sigilId(owner: string | null): string {
  return `${SIGIL_ID_PREFIX}-${cityAllegiance(owner)}`;
}

export function starPoints(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  points: number,
): string {
  const verts: string[] = [];
  const step = Math.PI / points;
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = i * step - Math.PI / 2;
    verts.push(
      `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`,
    );
  }
  return verts.join(" ");
}
