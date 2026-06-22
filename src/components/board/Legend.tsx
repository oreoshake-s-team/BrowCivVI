"use client";

import { useId, useState, type ReactNode } from "react";
import type { TerrainType } from "@/engine/map/terrain";
import type { UnitClass } from "@/engine/unit/classes";
import { cityAllegiance, CITY_MARKER_VIEWBOX } from "./cityMarkers";
import { CitySigilShape, SettlementShape } from "./CityMarks";
import styles from "./HexBoard.module.css";
import {
  CLASS_LABELS,
  CLASS_ORDER,
  FACTION_NAMES,
  factionStyle,
  TERRAIN_COLORS,
  TERRAIN_LABELS,
} from "./palette";
import { UNIT_SPRITE_PATHS, UNIT_SPRITE_VIEWBOX } from "./unitSprites";

const TERRAIN_ORDER: readonly TerrainType[] = [
  "plains",
  "hills",
  "forest",
  "marsh",
  "desert",
  "mountain",
  "coast",
  "deepSea",
];

const LEGEND_FACTIONS: readonly (string | null)[] = ["macedon", "persia", null];

const STORAGE_KEY = "browcivvi.legend-open";

function factionLabel(owner: string | null): string {
  return owner === null ? "Neutral" : (FACTION_NAMES[owner] ?? owner);
}

function LegendGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.legendGroup}>
      <h3 className={styles.legendGroupTitle}>{title}</h3>
      <ul className={styles.legendList}>{children}</ul>
    </div>
  );
}

export interface LegendProps {
  readonly unitClasses?: readonly UnitClass[];
}

export function Legend({ unitClasses = [] }: LegendProps) {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });
  const listId = useId();
  const presentClasses = CLASS_ORDER.filter((unitClass) => unitClasses.includes(unitClass));

  const toggle = () => {
    setOpen((value) => {
      const next = !value;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <section className={styles.legend} aria-label="Map legend">
      <button
        type="button"
        className={styles.legendToggle}
        aria-expanded={open}
        aria-controls={listId}
        onClick={toggle}
      >
        <span>Legend</span>
        <span className={styles.legendChevron} aria-hidden="true" data-open={open || undefined}>
          ▸
        </span>
      </button>
      {open ? (
        <div id={listId} className={styles.legendBody}>
          <LegendGroup title="Terrain">
            {TERRAIN_ORDER.map((terrain) => (
              <li key={terrain} className={styles.legendItem}>
                <span
                  className={styles.swatch}
                  style={{ backgroundColor: TERRAIN_COLORS[terrain] }}
                />
                {TERRAIN_LABELS[terrain]}
              </li>
            ))}
          </LegendGroup>
          <LegendGroup title="Factions">
            {LEGEND_FACTIONS.map((owner) => (
              <li key={owner ?? "neutral"} className={styles.legendItem}>
                <svg className={styles.legendIcon} viewBox={CITY_MARKER_VIEWBOX} aria-hidden="true">
                  <g style={{ color: factionStyle(owner).stroke }}>
                    <SettlementShape />
                  </g>
                  <g className={styles.legendSigil}>
                    <CitySigilShape allegiance={cityAllegiance(owner)} />
                  </g>
                </svg>
                {factionLabel(owner)}
              </li>
            ))}
          </LegendGroup>
          {presentClasses.length > 0 ? (
            <LegendGroup title="Units">
              {presentClasses.map((unitClass) => (
                <li key={unitClass} className={styles.legendItem}>
                  <svg
                    className={styles.legendUnitIcon}
                    viewBox={UNIT_SPRITE_VIEWBOX}
                    aria-hidden="true"
                  >
                    <path d={UNIT_SPRITE_PATHS[unitClass]} fill="currentColor" />
                  </svg>
                  {CLASS_LABELS[unitClass]}
                </li>
              ))}
            </LegendGroup>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
