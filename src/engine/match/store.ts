import type { MatchState } from "./state";

export class StaleMatchError extends Error {
  constructor(id: string) {
    super(`Stale write for match ${id}`);
    this.name = "StaleMatchError";
  }
}

export interface MatchStore {
  create(state: MatchState): Promise<void>;
  load(id: string): Promise<MatchState | null>;
  save(state: MatchState): Promise<MatchState>;
}

export class InMemoryMatchStore implements MatchStore {
  private readonly matches = new Map<string, MatchState>();

  create(state: MatchState): Promise<void> {
    this.matches.set(state.id, state);
    return Promise.resolve();
  }

  load(id: string): Promise<MatchState | null> {
    return Promise.resolve(this.matches.get(id) ?? null);
  }

  save(state: MatchState): Promise<MatchState> {
    const current = this.matches.get(state.id);
    if (current?.version !== state.version) {
      return Promise.reject(new StaleMatchError(state.id));
    }
    const next: MatchState = { ...state, version: state.version + 1 };
    this.matches.set(state.id, next);
    return Promise.resolve(next);
  }
}
