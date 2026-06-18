"use client";

import { useState } from "react";
import type { GameMap } from "@/engine/map/types";
import type { Unit } from "@/engine/unit/types";
import type { NamedRegion } from "@/engine/content/region";
import { hexKey } from "@/engine/map/types";
import { hexToPixel, hexPolygonPoints, mapPixelBounds } from "@/engine/map/layout";
import { unitTypeById } from "@/engine/unit/catalog";
import { TERRAIN_COLORS, CLASS_GLYPHS, factionStyle } from "./palette";
import { riverSegmentPoints } from "./geometry";
import { InfoPanel } from "./InfoPanel";
import { Legend } from "./Legend";
import styles from "./HexBoard.module.css";

const SIZE = 36;

const SEA_KINDS: ReadonlySet<NamedRegion["kind"]> = new Set(["sea", "strait"]);

export function HexBoard({
  map,
  units,
  regions = [],
}: {
  map: GameMap;
  units: readonly Unit[];
  regions?: readonly NamedRegion[];
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const bounds = mapPixelBounds(map, SIZE);
  const pad = SIZE;
  const viewBox = `${bounds.minX - pad} ${bounds.minY - pad} ${
    bounds.maxX - bounds.minX + pad * 2
  } ${bounds.maxY - bounds.minY + pad * 2}`;

  const selectedUnit = units.find((unit) => unit.id === selectedId) ?? null;

  return (
    <div className={styles.layout}>
      <svg
        className={styles.board}
        viewBox={viewBox}
        role="img"
        aria-label="Hex map of the Granicus crossing"
      >
        {Array.from(map.hexes.values()).map((mapHex) => {
          const key = hexKey(mapHex.hex);
          const center = hexToPixel(mapHex.hex, SIZE);
          const city = mapHex.cityId ? map.cities.get(mapHex.cityId) : undefined;
          return (
            <g key={key}>
              <polygon
                className={`hex ${styles.hex} ${hovered === key ? styles.hexHover : ""}`}
                points={hexPolygonPoints(center, SIZE)}
                fill={TERRAIN_COLORS[mapHex.terrain]}
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered((current) => (current === key ? null : current))}
              />
              <text className={styles.coord} x={center.x} y={center.y + SIZE * 0.74}>
                {mapHex.hex.q},{mapHex.hex.r}
              </text>
              {city ? (
                <text className={styles.city} x={center.x} y={center.y - SIZE * 0.5}>
                  {city.name}
                </text>
              ) : null}
            </g>
          );
        })}

        {map.rivers.map((river, index) => {
          const [p1, p2] = riverSegmentPoints(river.a, river.b, SIZE);
          return (
            <line
              key={`river-${index}`}
              className={styles.river}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
            />
          );
        })}

        {regions.map((region) => {
          const labelHex = region.labelHex;
          if (labelHex === undefined) return null;
          const center = hexToPixel(labelHex, SIZE);
          const className = SEA_KINDS.has(region.kind) ? styles.seaLabel : styles.featureLabel;
          return (
            <text key={region.id} className={className} x={center.x} y={center.y}>
              {region.name}
            </text>
          );
        })}

        {units.map((unit) => {
          const center = hexToPixel(unit.hex, SIZE);
          const type = unitTypeById(unit.typeId);
          const style = factionStyle(unit.owner);
          const selected = unit.id === selectedId;
          const select = () => setSelectedId(unit.id);
          return (
            <g
              key={unit.id}
              data-unit-id={unit.id}
              className={styles.token}
              role="button"
              tabIndex={0}
              aria-label={`${type?.name ?? unit.typeId} (${unit.owner})`}
              aria-pressed={selected}
              onClick={select}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  select();
                }
              }}
            >
              {selected ? (
                <circle className={styles.selectedRing} cx={center.x} cy={center.y} r={SIZE * 0.62} />
              ) : null}
              <circle
                cx={center.x}
                cy={center.y}
                r={SIZE * 0.5}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={2}
              />
              <text className={styles.glyph} x={center.x} y={center.y} fill={style.text}>
                {type ? CLASS_GLYPHS[type.class] : "?"}
              </text>
            </g>
          );
        })}
      </svg>

      <aside className={styles.sidebar}>
        <Legend />
        <InfoPanel unit={selectedUnit} />
      </aside>
    </div>
  );
}
