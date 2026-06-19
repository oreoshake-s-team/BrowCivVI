import { createMatchesTable, type SqlExecutor } from "./sql";

export interface LazyMigration {
  readonly executor: SqlExecutor;
  readonly migrate: () => Promise<void>;
}

export function lazyMigration(exec: SqlExecutor): LazyMigration {
  let inFlight: Promise<void> | undefined;

  const migrate = (): Promise<void> => {
    inFlight ??= createMatchesTable(exec).catch((error: unknown) => {
      inFlight = undefined;
      throw error;
    });
    return inFlight;
  };

  const executor: SqlExecutor = async (text, params) => {
    await migrate();
    return exec(text, params);
  };

  return { executor, migrate };
}
