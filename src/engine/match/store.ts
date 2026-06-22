import type { MatchState } from "./state";

export class StaleMatchError extends Error {
  constructor(id: string) {
    super(`Stale write for match ${id}`);
    this.name = "StaleMatchError";
  }
}

export interface OwnedMatch {
  readonly state: MatchState;
  readonly updatedAt: number;
}

export interface MatchStore {
  create(state: MatchState): Promise<void>;
  load(id: string): Promise<MatchState | null>;
  save(state: MatchState): Promise<MatchState>;
  listByOwner(owner: string): Promise<readonly OwnedMatch[]>;
  deleteByOwner(owner: string, keepId?: string): Promise<number>;
}

export class InMemoryMatchStore implements MatchStore {
  private readonly matches = new Map<string, OwnedMatch>();
  private lastNow = 0;

  private now(): number {
    this.lastNow = Math.max(Date.now(), this.lastNow + 1);
    return this.lastNow;
  }

  create(state: MatchState): Promise<void> {
    this.matches.set(state.id, { state, updatedAt: this.now() });
    return Promise.resolve();
  }

  load(id: string): Promise<MatchState | null> {
    return Promise.resolve(this.matches.get(id)?.state ?? null);
  }

  save(state: MatchState): Promise<MatchState> {
    const current = this.matches.get(state.id);
    if (current?.state.version !== state.version) {
      return Promise.reject(new StaleMatchError(state.id));
    }
    const next: MatchState = { ...state, version: state.version + 1 };
    this.matches.set(state.id, { state: next, updatedAt: this.now() });
    return Promise.resolve(next);
  }

  listByOwner(owner: string): Promise<readonly OwnedMatch[]> {
    const owned = [...this.matches.values()].filter((match) => match.state.owner === owner);
    return Promise.resolve(owned);
  }

  deleteByOwner(owner: string, keepId?: string): Promise<number> {
    let deleted = 0;
    for (const [id, match] of this.matches) {
      if (match.state.owner === owner && id !== keepId) {
        this.matches.delete(id);
        deleted += 1;
      }
    }
    return Promise.resolve(deleted);
  }
}
