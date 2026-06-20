"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Citation } from "@/engine/content/citation";
import type { MediaLink } from "@/engine/content/media";
import type { NamedRegion } from "@/engine/content/region";
import type { Hex } from "@/engine/hex";
import { hexToPixel, hexPolygonPoints, mapPixelBounds } from "@/engine/map/layout";
import { blocksLand, type TerrainType } from "@/engine/map/terrain";
import { hexKey } from "@/engine/map/types";
import type { GameMap } from "@/engine/map/types";
import { unitTypeById } from "@/engine/unit/catalog";
import type { Unit } from "@/engine/unit/types";
import { CitationCard } from "./CitationCard";
import { CitationTarget } from "./CitationTarget";
import DebugPanel from "./DebugPanel";
import { riverSegmentPoints } from "./geometry";
import styles from "./HexBoard.module.css";
import { InfoPanel } from "./InfoPanel";
import { Legend } from "./Legend";
import { TERRAIN_COLORS, CLASS_GLYPHS, factionStyle } from "./palette";
import { TerrainMotif } from "./TerrainMotif";
import { fitView, panView, zoomView, viewBoxString } from "./viewport";

const SIZE = 36;
const PAD = SIZE;
const PAN_THRESHOLD = 4;
const CITATION_HIDE_MS = 700;

const SEA_KINDS: ReadonlySet<NamedRegion["kind"]> = new Set(["sea", "strait"]);
const WATER_TERRAINS: ReadonlySet<TerrainType> = new Set(["coast", "deepSea"]);
const MEDIA_GLYPH = "▶";

function hasPlayableMedia(media: readonly MediaLink[] | undefined): boolean {
  return media?.some((item) => item.kind === "podcast" || item.kind === "video") ?? false;
}

function MediaGlyph() {
  return (
    <tspan className={styles.mediaGlyph} dx={4} aria-hidden="true">
      {MEDIA_GLYPH}
    </tspan>
  );
}

function riverGlyphAnchor(rivers: GameMap["rivers"], size: number): { x: number; y: number } {
  let best: { x: number; y: number } | null = null;
  for (const river of rivers) {
    const a = hexToPixel(river.a, size);
    const b = hexToPixel(river.b, size);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (best === null || mid.y > best.y) best = mid;
  }
  return best ?? { x: 0, y: 0 };
}

function riverBankKeys(map: GameMap): ReadonlySet<string> {
  const keys = new Set<string>();
  for (const river of map.rivers) {
    for (const endpoint of [river.a, river.b]) {
      const key = hexKey(endpoint);
      const tile = map.hexes.get(key);
      if (tile !== undefined && !WATER_TERRAINS.has(tile.terrain)) keys.add(key);
    }
  }
  return keys;
}

export interface DamageFloater {
  readonly id: string;
  readonly hex: Hex;
  readonly text: string;
}

export interface HexBoardProps {
  readonly map: GameMap;
  readonly units: readonly Unit[];
  readonly regions?: readonly NamedRegion[];
  readonly movement?: Readonly<Record<string, number>>;
  readonly playerFaction?: string;
  readonly reachable?: readonly Hex[];
  readonly attackable?: readonly Hex[];
  readonly floaters?: readonly DamageFloater[];
  readonly fadingUnits?: readonly Unit[];
  readonly onSelect?: (unitId: string | null) => void;
  readonly onMove?: (unitId: string, to: Hex) => void;
  readonly onAttack?: (attackerId: string, target: Hex) => void;
}

export function HexBoard({
  map,
  units,
  regions = [],
  movement = {},
  playerFaction = "",
  reachable = [],
  attackable = [],
  floaters = [],
  fadingUnits = [],
  onSelect,
  onMove,
  onAttack,
}: HexBoardProps) {
  const bounds = mapPixelBounds(map, SIZE);
  const fitW = bounds.maxX - bounds.minX + PAD * 2;

  const [hovered, setHovered] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState(() => fitView(bounds, PAD));
  const [cited, setCited] = useState<{
    name: string;
    citation: Citation;
    x: number;
    y: number;
    media?: readonly MediaLink[] | undefined;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number; sx: number; sy: number }>());
  const pinchDist = useRef<number | null>(null);
  const moved = useRef(false);
  const pointerType = useRef<string>("mouse");

  const selectedUnit = units.find((unit) => unit.id === selectedId) ?? null;
  const selectedMoves =
    selectedUnit !== null && selectedUnit.owner === playerFaction
      ? {
          remaining: movement[selectedUnit.id] ?? 0,
          max: unitTypeById(selectedUnit.typeId)?.movement ?? 0,
        }
      : null;
  const reachableKeys = new Set(reachable.map(hexKey));
  const river = regions.find((region) => region.kind === "river");
  const granicus = river !== undefined && hasPlayableMedia(river.media) ? river : undefined;
  const bankKeys = granicus !== undefined ? riverBankKeys(map) : new Set<string>();
  const attackableKeys = new Set(attackable.map(hexKey));
  const occupiedKeys = new Set(units.map((unit) => hexKey(unit.hex)));
  const labeledHexKeys = new Set(
    regions.flatMap((region) => (region.labelHex ? [hexKey(region.labelHex)] : [])),
  );

  const select = (unitId: string | null) => {
    setSelectedId(unitId);
    onSelect?.(unitId);
  };

  const [showQandR, setShowQandR] = useState(false);

  const tryMove = (target: Hex) => {
    if (selectedId !== null && onMove && reachableKeys.has(hexKey(target)))
      onMove(selectedId, target);
  };

  const tapHex = (hex: Hex) => {
    if (moved.current) return;
    setCited(null);
    if (pointerType.current !== "mouse" && reachableKeys.has(hexKey(hex))) tryMove(hex);
    else select(null);
  };

  const cancelHide = () => {
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const showCitation = (
    name: string,
    citation: Citation,
    target: SVGElement,
    media?: readonly MediaLink[],
  ) => {
    cancelHide();
    const host = containerRef.current?.getBoundingClientRect();
    if (host === undefined) return;
    const rect = target.getBoundingClientRect();
    setCited({
      name,
      citation,
      x: rect.left - host.left + rect.width / 2,
      y: rect.top - host.top,
      media,
    });
  };

  const scheduleHide = () => {
    cancelHide();
    hideTimer.current = setTimeout(() => {
      setCited(null);
    }, CITATION_HIDE_MS);
  };

  useEffect(() => {
    if (cited === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCited(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [cited]);

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    pointerType.current = event.pointerType;
    moved.current = false;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      sx: event.clientX,
      sy: event.clientY,
    });
    const [a, b] = [...pointers.current.values()];
    if (a && b) pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const prev = pointers.current.get(event.pointerId);
    if (prev === undefined) return;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      sx: prev.sx,
      sy: prev.sy,
    });
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect === undefined || rect.width === 0) return;
    const [a, b] = [...pointers.current.values()];
    if (a && b) {
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist.current !== null && dist > 0) {
        const factor = pinchDist.current / dist;
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        setView((v) =>
          zoomView(
            v,
            factor,
            v.x + ((midX - rect.left) / rect.width) * v.w,
            v.y + ((midY - rect.top) / rect.height) * v.h,
            fitW,
          ),
        );
        pinchDist.current = dist;
        moved.current = true;
      }
      return;
    }
    if (
      Math.hypot(event.clientX - prev.sx, event.clientY - prev.sy) > PAN_THRESHOLD &&
      !moved.current
    ) {
      moved.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const dx = event.clientX - prev.x;
    const dy = event.clientY - prev.y;
    setView((v) => panView(v, (dx / rect.width) * v.w, (dy / rect.height) * v.h));
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (svg === null) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0) return;
      const factor = event.deltaY > 0 ? 1.1 : 0.9;
      setView((v) =>
        zoomView(
          v,
          factor,
          v.x + ((event.clientX - rect.left) / rect.width) * v.w,
          v.y + ((event.clientY - rect.top) / rect.height) * v.h,
          fitW,
        ),
      );
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      svg.removeEventListener("wheel", onWheel);
    };
  }, [fitW]);

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchDist.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className={styles.layout} ref={containerRef}>
      <svg
        ref={svgRef}
        className={styles.board}
        viewBox={viewBoxString(view)}
        role="img"
        aria-label="Hex map of the Granicus crossing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {Array.from(map.hexes.values()).map((mapHex) => {
          const key = hexKey(mapHex.hex);
          const center = hexToPixel(mapHex.hex, SIZE);
          const city = mapHex.cityId ? map.cities.get(mapHex.cityId) : undefined;
          const cityCitation = city?.citation;
          const bankRegion = granicus !== undefined && bankKeys.has(key) ? granicus : undefined;
          const isBank = bankRegion !== undefined;
          const landBlocked = blocksLand(mapHex.terrain);
          return (
            <g key={key} data-testid={`hex-${key}`}>
              <polygon
                data-hex={key}
                data-blocked={landBlocked || undefined}
                className={[
                  "hex",
                  styles.hex,
                  landBlocked ? styles.hexBlocked : undefined,
                  hovered === key ? styles.hexHover : undefined,
                  isBank ? styles.hexBank : undefined,
                ]
                  .filter(Boolean)
                  .join(" ")}
                points={hexPolygonPoints(center, SIZE)}
                style={{ fill: TERRAIN_COLORS[mapHex.terrain] }}
                tabIndex={isBank ? 0 : undefined}
                role={isBank ? "button" : undefined}
                aria-label={
                  isBank ? `${bankRegion.name} riverbank historical reference` : undefined
                }
                onMouseEnter={(event) => {
                  setHovered(key);
                  if (bankRegion !== undefined && selectedId === null && !occupiedKeys.has(key))
                    showCitation(
                      bankRegion.name,
                      bankRegion.citation,
                      event.currentTarget,
                      bankRegion.media,
                    );
                }}
                onMouseLeave={() => {
                  setHovered((current) => (current === key ? null : current));
                  if (bankRegion !== undefined) scheduleHide();
                }}
                onFocus={(event) => {
                  if (bankRegion !== undefined)
                    showCitation(
                      bankRegion.name,
                      bankRegion.citation,
                      event.currentTarget,
                      bankRegion.media,
                    );
                }}
                onBlur={() => {
                  if (bankRegion !== undefined) scheduleHide();
                }}
                onClick={() => {
                  tapHex(mapHex.hex);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  if (!moved.current) tryMove(mapHex.hex);
                }}
              />
              {isBank ? (
                <polygon
                  className={["bank", styles.bank].filter(Boolean).join(" ")}
                  points={hexPolygonPoints(center, SIZE)}
                  pointerEvents="none"
                />
              ) : null}
              {labeledHexKeys.has(key) ? null : (
                <TerrainMotif terrain={mapHex.terrain} cx={center.x} cy={center.y} size={SIZE} />
              )}
              {showQandR && (
                <text className={styles.coord} x={center.x} y={center.y + SIZE * 0.74}>
                  {mapHex.hex.q}, {mapHex.hex.r}
                </text>
              )}
              {city && cityCitation !== undefined && hasPlayableMedia(city.media) ? (
                <CitationTarget
                  label={city.name}
                  className={styles.citeTarget}
                  onShow={(target) => {
                    showCitation(city.name, cityCitation, target, city.media);
                  }}
                  onHide={() => {
                    scheduleHide();
                  }}
                >
                  <text className={styles.city} x={center.x} y={center.y - SIZE * 0.5}>
                    {city.name}
                    <MediaGlyph />
                  </text>
                </CitationTarget>
              ) : city ? (
                <text className={styles.city} x={center.x} y={center.y - SIZE * 0.5}>
                  {city.name}
                </text>
              ) : null}
            </g>
          );
        })}

        {reachable.map((hex) => (
          <polygon
            key={`reach-${hexKey(hex)}`}
            className={["reach", styles.reach].filter(Boolean).join(" ")}
            points={hexPolygonPoints(hexToPixel(hex, SIZE), SIZE)}
          />
        ))}

        {map.rivers.length > 0 && granicus !== undefined ? (
          <CitationTarget
            label={granicus.name}
            className={styles.citeTarget}
            onShow={(target) => {
              showCitation(granicus.name, granicus.citation, target, granicus.media);
            }}
            onHide={() => {
              scheduleHide();
            }}
          >
            {map.rivers.map((river, index) => {
              const [p1, p2] = riverSegmentPoints(river.a, river.b, SIZE);
              return (
                <line
                  key={`river-${index}`}
                  className={["river", styles.river].filter(Boolean).join(" ")}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                />
              );
            })}
            <text
              className={styles.riverGlyph}
              x={riverGlyphAnchor(map.rivers, SIZE).x}
              y={riverGlyphAnchor(map.rivers, SIZE).y + SIZE * 0.5}
              aria-hidden="true"
            >
              {MEDIA_GLYPH}
            </text>
          </CitationTarget>
        ) : null}

        {regions.map((region) => {
          const labelHex = region.labelHex;
          if (labelHex === undefined) return null;
          const center = hexToPixel(labelHex, SIZE);
          const className = SEA_KINDS.has(region.kind) ? styles.seaLabel : styles.featureLabel;
          if (!hasPlayableMedia(region.media)) {
            return (
              <text key={region.id} className={className} x={center.x} y={center.y}>
                {region.name}
              </text>
            );
          }
          return (
            <CitationTarget
              key={region.id}
              label={region.name}
              className={styles.citeTarget}
              onShow={(target) => {
                showCitation(region.name, region.citation, target, region.media);
              }}
              onHide={() => {
                scheduleHide();
              }}
            >
              <text className={className} x={center.x} y={center.y}>
                {region.name}
                <MediaGlyph />
              </text>
            </CitationTarget>
          );
        })}

        {units.map((unit) => {
          const center = hexToPixel(unit.hex, SIZE);
          const type = unitTypeById(unit.typeId);
          const style = factionStyle(unit.owner);
          const selected = unit.id === selectedId;
          const isAttackTarget =
            selectedId !== null && selectedId !== unit.id && attackableKeys.has(hexKey(unit.hex));
          const moves = movement[unit.id];
          const showMoves = unit.owner === playerFaction && moves !== undefined && moves > 0;
          const toggle = () => {
            if (moved.current) return;
            setCited(null);
            select(selected ? null : unit.id);
          };
          const doAttack = () => {
            if (selectedId !== null && onAttack) onAttack(selectedId, unit.hex);
          };
          return (
            <g
              key={unit.id}
              data-unit-id={unit.id}
              className={styles.token}
              transform={`translate(${center.x}, ${center.y})`}
              role="button"
              tabIndex={0}
              aria-label={`${type?.name ?? unit.typeId} (${unit.owner})${isAttackTarget ? " — attackable" : ""}`}
              aria-pressed={selected}
              onClick={(event) => {
                event.stopPropagation();
                if (moved.current) return;
                if (pointerType.current !== "mouse" && isAttackTarget) doAttack();
                else toggle();
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                if (!moved.current && isAttackTarget) doAttack();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (isAttackTarget) doAttack();
                  else select(selected ? null : unit.id);
                }
              }}
            >
              {selected ? (
                <circle className={styles.selectedRing} cx={0} cy={0} r={SIZE * 0.62} />
              ) : null}
              <circle
                cx={0}
                cy={0}
                r={SIZE * 0.5}
                style={{ fill: style.fill, stroke: style.stroke }}
                strokeWidth={2}
              />
              <text className={styles.glyph} x={0} y={0} style={{ fill: style.text }}>
                {type ? CLASS_GLYPHS[type.class] : "?"}
              </text>
              {isAttackTarget ? (
                <g className={styles.attackMark} data-attack-target={unit.id}>
                  <line x1={-SIZE * 0.18} y1={-SIZE * 0.96} x2={SIZE * 0.18} y2={-SIZE * 0.6} />
                  <line x1={-SIZE * 0.18} y1={-SIZE * 0.6} x2={SIZE * 0.18} y2={-SIZE * 0.96} />
                </g>
              ) : null}
              {showMoves ? (
                <g
                  className={styles.movesBadge}
                  data-moves={unit.id}
                  transform={`translate(0, ${SIZE * 0.84})`}
                >
                  <rect
                    className={styles.movesPill}
                    x={-SIZE * 0.42}
                    y={-SIZE * 0.28}
                    width={SIZE * 0.84}
                    height={SIZE * 0.52}
                    rx={SIZE * 0.26}
                  />
                  <text className={styles.movesText} x={0} y={0}>
                    {moves}/{type?.movement ?? 0}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}

        {fadingUnits.map((unit) => {
          const center = hexToPixel(unit.hex, SIZE);
          const type = unitTypeById(unit.typeId);
          const style = factionStyle(unit.owner);
          return (
            <g
              key={`fade-${unit.id}`}
              className={styles.fading}
              data-fading-id={unit.id}
              transform={`translate(${center.x}, ${center.y})`}
            >
              <circle
                cx={0}
                cy={0}
                r={SIZE * 0.5}
                style={{ fill: style.fill, stroke: style.stroke }}
                strokeWidth={2}
              />
              <text className={styles.glyph} x={0} y={0} style={{ fill: style.text }}>
                {type ? CLASS_GLYPHS[type.class] : "?"}
              </text>
            </g>
          );
        })}

        {floaters.map((floater) => {
          const center = hexToPixel(floater.hex, SIZE);
          return (
            <text
              key={floater.id}
              className={styles.floater}
              x={center.x}
              y={center.y - SIZE * 0.2}
            >
              {floater.text}
            </text>
          );
        })}
      </svg>

      <aside className={styles.sidebar}>
        <Legend />
        <InfoPanel unit={selectedUnit} moves={selectedMoves} />
        <DebugPanel onToggleQR={setShowQandR} showQandR={showQandR} />
      </aside>

      {cited !== null ? (
        <CitationCard
          name={cited.name}
          citation={cited.citation}
          x={cited.x}
          y={cited.y}
          media={cited.media}
          onClose={() => {
            setCited(null);
          }}
          onMouseEnter={() => {
            cancelHide();
          }}
          onMouseLeave={() => {
            scheduleHide();
          }}
        />
      ) : null}
    </div>
  );
}
