import { pendingMigrations } from "../../scripts/migration-plan.mjs";
import { getNodeDatabaseUrl, getRuntimePostgresUrl } from "./runtime-db-url";

/** Which database backend is active. */
export type DbSource = "neon" | "pglite";

/**
 * Minimal shared SQL surface, satisfied by Neon via `pg` and by PGLite. Both the
 * tagged-template and `.query()` forms resolve to an array of row objects.
 */
export interface Sql {
  <T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

function templateToQuery(strings: TemplateStringsArray, values: unknown[]) {
  let text = "";
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) text += `$${i + 1}`;
  }
  return { text, params: values };
}

const globalRef = globalThis as typeof globalThis & {
  __pgliteInstance__?: Promise<unknown>;
  __pgliteSql__?: Promise<Sql>;
};

// Matches the server-boundary helpers (coerceRow / coerceRows) so reads from pg
// (Neon) and PGLite produce identical shapes. Do not parse "date" (OID 1082).
function coerceCell(value: unknown): unknown {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return Number(value);
  return value;
}

function coerceRow<T>(row: unknown): T {
  if (row == null || typeof row !== "object" || Array.isArray(row)) {
    return row as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
    out[key] = coerceCell(value);
  }
  return out as T;
}

let cachedUrl: string | undefined;
let cachedUrlPromise: Promise<string | undefined> | null = null;

async function resolvePostgresUrl(): Promise<string | undefined> {
  if (cachedUrl !== undefined) return cachedUrl || undefined;
  if (cachedUrlPromise) return cachedUrlPromise;
  cachedUrlPromise = (async () => {
    const url = await getRuntimePostgresUrl();
    cachedUrl = url || "";
    return url;
  })();
  return cachedUrlPromise;
}

/** Best-effort sync source hint for Node contexts; runtime may resolve later. */
export let dbSource: DbSource = getNodeDatabaseUrl() ? "neon" : "pglite";

function getPgliteInstance() {
  if (!globalRef.__pgliteInstance__) {
    globalRef.__pgliteInstance__ = (async () => {
      const { PGlite } = await import("@electric-sql/pglite");
      const pg = new PGlite({
        // Fresh in-memory DB per serverless invocation. Same model as ephemeral
        // sandboxes: data lasts for the lifetime of the runtime.
      });
      await (pg as any).waitReady;
      await (pg as any).exec(
        "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
      );
      return pg;
    })();
  }
  return globalRef.__pgliteInstance__ as Promise<any>;
}

function getPgliteSql(): Promise<Sql> {
  if (!globalRef.__pgliteSql__) {
    globalRef.__pgliteSql__ = (async () => {
      const pg = await getPgliteInstance();

      // Apply bundled migrations exactly once per runtime, tracked in `_migrations`.
      const doneRows = await pg.query("select name from _migrations");
      const applied = (doneRows.rows as Array<{ name: string }>).map((r) => r.name);

      const migrations = import.meta.glob("../../migrations/*.sql", {
        eager: true,
        query: "?raw",
        import: "default",
      }) as Record<string, string>;

      const pending = pendingMigrations(Object.keys(migrations), applied);
      if (pending.length > 0) {
        await pg.transaction(async (tx: any) => {
          for (const { name, path } of pending) {
            await tx.exec(migrations[path]!);
            await tx.query("insert into _migrations (name) values ($1)", [name]);
          }
        });
      }

      const query = async <T>(text: string, params: unknown[] = []) => {
        const result = await pg.query(text, params);
        return (result.rows as unknown[]).map((r) => coerceRow<T>(r));
      };
      const sql = (async <T>(strings: TemplateStringsArray, ...values: unknown[]) => {
        const { text, params } = templateToQuery(strings, values);
        return query<T>(text, params);
      }) as Sql;
      sql.query = query;
      return sql;
    })();
  }
  return globalRef.__pgliteSql__;
}

/**
 * Run one database operation with a request-scoped PostgreSQL client.
 * Hyperdrive pools upstream connections, so Workers should not retain a pg Pool
 * across requests.
 */
export async function withSql<T>(run: (sql: Sql) => Promise<T>): Promise<T> {
  const url = await resolvePostgresUrl();
  if (!url) {
    dbSource = "pglite";
    return run(await getPgliteSql());
  }

  dbSource = "neon";
  type PgClient = {
    connect(): Promise<void>;
    query(text: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
    end(): Promise<void>;
  };
  type PgTypes = {
    setTypeParser(oid: number, parser: (value: string) => unknown): void;
  };
  type PgModule = {
    Client?: new (options: { connectionString: string }) => PgClient;
    types?: PgTypes;
    default?: { Client?: PgModule["Client"]; types?: PgTypes };
  };
  const pgMod = (await import("pg")) as unknown as PgModule;
  const Client = pgMod.Client ?? pgMod.default?.Client;
  if (!Client) throw new Error("Postgres Client is unavailable");

  const types = pgMod.types ?? pgMod.default?.types;
  if (types?.setTypeParser) {
    types.setTypeParser(20, (value) => Number(value));
    types.setTypeParser(1114, (value) => new Date(value.replace(" ", "T") + "Z").toISOString());
    types.setTypeParser(1184, (value) => new Date(value).toISOString());
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const query = async <Row>(text: string, params: unknown[] = []) => {
      const result = await client.query(text, params);
      return result.rows.map((row) => coerceRow<Row>(row));
    };
    const sql = (async <Row>(strings: TemplateStringsArray, ...values: unknown[]) => {
      const { text, params } = templateToQuery(strings, values);
      return query<Row>(text, params);
    }) as Sql;
    sql.query = query;
    return await run(sql);
  } finally {
    await client.end();
  }
}

/**
 * The shared PGLite instance (e.g. for a Kysely dialect). Throws when Postgres
 * is configured for this runtime.
 */
export async function getPglite(): Promise<any> {
  const url = await resolvePostgresUrl();
  if (url) {
    throw new Error("getPglite() is only available on the PGLite fallback (no Postgres URL)");
  }
  dbSource = "pglite";
  await getPgliteSql();
  const pg = await getPgliteInstance();
  if (!pg) throw new Error("PGLite instance failed to initialize");
  return pg;
}

/**
 * Await until the local PGLite fallback is fully ready (migrations applied).
 * - No-op when a Postgres URL is configured (Hyperdrive/DATABASE_URL path).
 * - Safe to call multiple times.
 */
export async function ensureDbReady(): Promise<void> {
  const url = await resolvePostgresUrl();
  if (!url) {
    dbSource = "pglite";
    await getPgliteSql();
  } else {
    dbSource = "neon";
  }
}
