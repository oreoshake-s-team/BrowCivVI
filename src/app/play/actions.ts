"use server";

import { cookies } from "next/headers";
import { FIRST_SLICE_MAP } from "@/content/firstSlice";
import type { Hex } from "@/engine/hex";
import { hexKey } from "@/engine/map/types";
import type { MatchState } from "@/engine/match/state";
import { availableMoves, resolveMove } from "@/engine/movement/resolveMove";
import { unitTypeById } from "@/engine/unit/catalog";
import type { MovementDomain } from "@/engine/unit/classes";
import { domainForClass } from "@/engine/unit/classes";
import type { Unit } from "@/engine/unit/types";
import { IDENTITY_COOKIE, signIdentity, verifyIdentity, newIdentityId } from "@/server/identity";
import { getOrCreateMatch } from "@/server/matchService";
import { getStore, ensureMigrated } from "@/server/store";

async function currentOwner(): Promise<string> {
  const jar = await cookies();
  const raw = jar.get(IDENTITY_COOKIE)?.value;
  const existing = raw === undefined ? null : verifyIdentity(raw);
  if (existing !== null) return existing;
  const id = newIdentityId();
  jar.set(IDENTITY_COOKIE, signIdentity(id), { httpOnly: true, sameSite: "lax", path: "/" });
  return id;
}

function domainOf(typeId: string): MovementDomain {
  const type = unitTypeById(typeId);
  return type ? domainForClass(type.class) : "land";
}

function occupiedExcept(match: MatchState, unitId: string): ReadonlySet<string> {
  return new Set(match.units.filter((unit) => unit.id !== unitId).map((unit) => hexKey(unit.hex)));
}

function reachableForUnit(match: MatchState, unit: Unit): readonly Hex[] {
  return availableMoves({
    from: unit.hex,
    movement: match.movement[unit.id] ?? 0,
    domain: domainOf(unit.typeId),
    map: FIRST_SLICE_MAP,
    blocked: occupiedExcept(match, unit.id),
  });
}

async function currentMatch(): Promise<MatchState> {
  await ensureMigrated();
  return getOrCreateMatch(getStore(), await currentOwner());
}

export async function loadBoard(): Promise<{ readonly units: readonly Unit[] }> {
  return { units: (await currentMatch()).units };
}

export async function reachableFor(unitId: string): Promise<readonly Hex[]> {
  const match = await currentMatch();
  const unit = match.units.find((candidate) => candidate.id === unitId);
  return unit === undefined ? [] : reachableForUnit(match, unit);
}

export async function move(
  unitId: string,
  to: Hex,
): Promise<{ readonly units: readonly Unit[]; readonly reachable: readonly Hex[] }> {
  await ensureMigrated();
  const store = getStore();
  const match = await getOrCreateMatch(store, await currentOwner());
  const unit = match.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined) return { units: match.units, reachable: [] };

  const result = resolveMove({
    unitId,
    from: unit.hex,
    to,
    movement: match.movement[unitId] ?? 0,
    domain: domainOf(unit.typeId),
    map: FIRST_SLICE_MAP,
    blocked: occupiedExcept(match, unitId),
  });
  if (!result.ok) return { units: match.units, reachable: reachableForUnit(match, unit) };

  const next: MatchState = {
    ...match,
    units: match.units.map((u) => (u.id === unitId ? { ...u, hex: result.hex } : u)),
    movement: { ...match.movement, [unitId]: result.remaining },
  };
  const saved = await store.save(next);
  const movedUnit = saved.units.find((candidate) => candidate.id === unitId);
  return {
    units: saved.units,
    reachable: movedUnit === undefined ? [] : reachableForUnit(saved, movedUnit),
  };
}
