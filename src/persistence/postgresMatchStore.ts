import type { MatchState } from "@/engine/match/state";
import type { MatchStore } from "@/engine/match/store";
import { StaleMatchError } from "@/engine/match/store";
import { upcastMatchState } from "@/engine/match/upcast";
import type { SqlExecutor } from "./sql";

export class PostgresMatchStore implements MatchStore {
  constructor(private readonly exec: SqlExecutor) {}

  async create(state: MatchState): Promise<void> {
    await this.exec(
      "INSERT INTO matches (id, owner, version, schema_version, state) VALUES ($1, $2, $3, $4, $5)",
      [state.id, state.owner, state.version, state.schemaVersion, JSON.stringify(state)],
    );
  }

  async load(id: string): Promise<MatchState | null> {
    const rows = await this.exec("SELECT state, version FROM matches WHERE id = $1", [id]);
    const row = rows[0];
    if (row === undefined) return null;
    const raw: unknown = typeof row.state === "string" ? JSON.parse(row.state) : row.state;
    return { ...upcastMatchState(raw), version: Number(row.version) };
  }

  async save(state: MatchState): Promise<MatchState> {
    const next: MatchState = { ...state, version: state.version + 1 };
    const rows = await this.exec(
      "UPDATE matches SET state = $1, version = $2, updated_at = now() WHERE id = $3 AND version = $4 RETURNING version",
      [JSON.stringify(next), next.version, state.id, state.version],
    );
    if (rows[0] === undefined) throw new StaleMatchError(state.id);
    return next;
  }
}
