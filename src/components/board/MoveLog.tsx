"use client";

import { useEffect, useRef } from "react";
import type { Hex } from "@/engine/hex";
import type {
  AttackEvent,
  CaptureEvent,
  CityAttackEvent,
  DefectionEvent,
  MatchEvent,
  MoveEvent,
} from "@/engine/match/events";
import { unitTypeById } from "@/engine/unit/catalog";
import styles from "./MoveLog.module.css";
import { factionName } from "./palette";

function unitName(typeId: string): string {
  return unitTypeById(typeId)?.name ?? typeId;
}

function coord(hex: Hex): string {
  return `(${hex.q}, ${hex.r})`;
}

function MoveEntry({ event }: { readonly event: MoveEvent }) {
  return (
    <>
      <span className={styles.icon} aria-hidden="true">
        →
      </span>
      <span className={styles.actor} data-faction={event.faction}>
        {unitName(event.unitTypeId)}
      </span>{" "}
      moved {coord(event.from)} → {coord(event.to)}
    </>
  );
}

function AttackEntry({ event }: { readonly event: AttackEvent }) {
  const defeated = event.defeated.includes(event.targetId);
  return (
    <>
      <span className={styles.icon} aria-hidden="true">
        ⚔
      </span>
      <span className={styles.actor} data-faction={event.faction}>
        {unitName(event.unitTypeId)}
      </span>{" "}
      attacked {unitName(event.targetTypeId)} at {coord(event.targetHex)} — dealt{" "}
      {event.defenderDamage}, took {event.attackerDamage}
      {defeated ? <span className={styles.defeated}> (defeated)</span> : null}
    </>
  );
}

function CityAttackEntry({
  event,
  cityName,
}: {
  readonly event: CityAttackEvent;
  readonly cityName: string;
}) {
  return (
    <>
      <span className={styles.icon} aria-hidden="true">
        ⚔
      </span>
      <span className={styles.actor} data-faction={event.faction}>
        {unitName(event.unitTypeId)}
      </span>{" "}
      besieged {cityName} — dealt {event.cityDamage}, took {event.retaliation}
      {event.cityFell ? <span className={styles.defeated}> (walls breached)</span> : null}
    </>
  );
}

function CaptureEntry({
  event,
  cityName,
}: {
  readonly event: CaptureEvent;
  readonly cityName: string;
}) {
  return (
    <>
      <span className={styles.icon} aria-hidden="true">
        ★
      </span>
      <span className={styles.actor} data-faction={event.faction}>
        {factionName(event.faction)}
      </span>{" "}
      captured {cityName} from {factionName(event.previousOwner)}
    </>
  );
}

function DefectionEntry({
  event,
  cityName,
  playerFaction,
}: {
  readonly event: DefectionEvent;
  readonly cityName: string;
  readonly playerFaction: string | undefined;
}) {
  const gained = playerFaction !== undefined && event.faction === playerFaction;
  const lost = playerFaction !== undefined && event.previousOwner === playerFaction;
  return (
    <>
      <span className={styles.icon} aria-hidden="true">
        ⚑
      </span>
      <span className={styles.actor} data-faction={event.faction}>
        {factionName(event.faction)}
      </span>{" "}
      won over{" "}
      <span
        className={styles.defectedCity}
        data-defection={gained ? "gain" : lost ? "loss" : undefined}
      >
        {cityName}
      </span>
    </>
  );
}

export function MoveLog({
  events,
  cityNames,
  playerFaction,
}: {
  readonly events: readonly MatchEvent[];
  readonly cityNames?: ReadonlyMap<string, string>;
  readonly playerFaction?: string;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (el !== null) el.scrollTop = el.scrollHeight;
  }, [events.length]);

  const cityName = (id: string): string => cityNames?.get(id) ?? id;

  return (
    <section className={styles.panel} aria-label="Move and attack log">
      <h2 className={styles.heading}>Battle log</h2>
      {events.length === 0 ? (
        <p className={styles.empty}>No actions yet. Select a unit to begin.</p>
      ) : (
        <ol className={styles.entries} ref={listRef} aria-live="polite">
          {events.map((event) => (
            <li key={event.seq} className={styles.entry}>
              <span className={styles.turn}>Turn {event.turn}</span>{" "}
              {event.kind === "move" ? (
                <MoveEntry event={event} />
              ) : event.kind === "attack" ? (
                <AttackEntry event={event} />
              ) : event.kind === "cityAttack" ? (
                <CityAttackEntry event={event} cityName={cityName(event.cityId)} />
              ) : event.kind === "capture" ? (
                <CaptureEntry event={event} cityName={cityName(event.cityId)} />
              ) : (
                <DefectionEntry
                  event={event}
                  cityName={cityName(event.cityId)}
                  playerFaction={playerFaction}
                />
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
