"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { GameMap } from "@/engine/map/types";
import type { Hex } from "@/engine/hex";
import type { Unit } from "@/engine/unit/types";
import type { NamedRegion } from "@/engine/content/region";
import { hexKey } from "@/engine/map/types";
import { hexToPixel, hexPolygonPoints, mapPixelBounds } from "@/engine/map/layout";
import { unitTypeById } from "@/engine/unit/catalog";
import { TERRAIN_COLORS, CLASS_GLYPHS, factionStyle } from "./palette";
import { riverSegmentPoints } from "./geometry";
import { fitView, panView, zoomView, viewBoxString } from "./viewport";
import { InfoPanel } from "./InfoPanel";
import { Legend } from "./Legend";
import styles from "./HexBoard.module.css";

const SIZE = 36;
const PAD = SIZE;
const PAN_THRESHOLD = 4;

const SEA_KINDS: ReadonlySet<NamedRegion["kind"]> = new Set(["sea", "strait"]);

export interface HexBoardProps {
  readonly map: GameMap;
  readonly units: readonly Unit[];
  readonly regions?: readonly NamedRegion[];
  readonly reachable?: readonly Hex[];
  readonly onSelect?: (unitId: string | null) => void;
  readonly onMove?: (unitId: string, to: Hex) => void;
}

export function HexBoard({ map, units, regions = [], reachable = [], onSelect, onMove }: HexBoardProps) {
  const bounds = mapPixelBounds(map, SIZE);
  const fitW = bounds.maxX - bounds.minX + PAD * 2;

  const [hovered, setHovered] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState(() => fitView(bounds, PAD));

  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number; sx: number; sy: number }>());
  const pinchDist = useRef<number | null>(null);
  const moved = useRef(false);
  const pointerType = useRef<string>("mouse");

  const selectedUnit = units.find((unit) => unit.id === selectedId) ?? null;
  const reachableKeys = new Set(reachable.map(hexKey));

  const select = (unitId: string | null) => {
    setSelectedId(unitId);
    onSelect?.(unitId);
  };

  const tryMove = (target: Hex) => {
    if (selectedId !== null && onMove && reachableKeys.has(hexKey(target))) onMove(selectedId, target);
  };

  const tapHex = (hex: Hex) => {
    if (moved.current) return;
    if (pointerType.current !== "mouse" && reachableKeys.has(hexKey(hex))) tryMove(hex);
    else select(null);
  };

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    pointerType.current = event.pointerType;
    moved.current = false;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY, sx: event.clientX, sy: event.clientY });
    const [a, b] = [...pointers.current.values()];
    if (a && b) pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const prev = pointers.current.get(event.pointerId);
    if (prev === undefined) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY, sx: prev.sx, sy: prev.sy });
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
          zoomView(v, factor, v.x + ((midX - rect.left) / rect.width) * v.w, v.y + ((midY - rect.top) / rect.height) * v.h, fitW),
        );
        pinchDist.current = dist;
        moved.current = true;
      }
      return;
    }
    if (Math.hypot(event.clientX - prev.sx, event.clientY - prev.sy) > PAN_THRESHOLD && !moved.current) {
      moved.current = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
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
        zoomView(v, factor, v.x + ((event.clientX - rect.left) / rect.width) * v.w, v.y + ((event.clientY - rect.top) / rect.height) * v.h, fitW),
      );
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [fitW]);

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchDist.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return (
    <div className={styles.layout}>
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
          return (
            <g key={key}>
              <polygon
                data-hex={key}
                className={`hex ${styles.hex} ${hovered === key ? styles.hexHover : ""}`}
                points={hexPolygonPoints(center, SIZE)}
                style={{ fill: TERRAIN_COLORS[mapHex.terrain] }}
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered((current) => (current === key ? null : current))}
                onClick={() => tapHex(mapHex.hex)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  if (!moved.current) tryMove(mapHex.hex);
                }}
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

        {reachable.map((hex) => (
          <polygon
            key={`reach-${hexKey(hex)}`}
            className={`reach ${styles.reach}`}
            points={hexPolygonPoints(hexToPixel(hex, SIZE), SIZE)}
          />
        ))}

        {map.rivers.map((river, index) => {
          const [p1, p2] = riverSegmentPoints(river.a, river.b, SIZE);
          return (
            <line key={`river-${index}`} className={styles.river} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} />
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
          const toggle = () => {
            if (moved.current) return;
            select(selected ? null : unit.id);
          };
          return (
            <g
              key={unit.id}
              data-unit-id={unit.id}
              className={styles.token}
              transform={`translate(${center.x}, ${center.y})`}
              role="button"
              tabIndex={0}
              aria-label={`${type?.name ?? unit.typeId} (${unit.owner})`}
              aria-pressed={selected}
              onClick={(event) => {
                event.stopPropagation();
                toggle();
              }}
              onContextMenu={(event) => event.preventDefault()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  select(selected ? null : unit.id);
                }
              }}
            >
              {selected ? <circle className={styles.selectedRing} cx={0} cy={0} r={SIZE * 0.62} /> : null}
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
      </svg>

      <aside className={styles.sidebar}>
        <Legend />
        <InfoPanel unit={selectedUnit} />
      </aside>
    </div>
  );
}
