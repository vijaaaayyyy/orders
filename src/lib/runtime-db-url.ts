import { getHyperdriveConnectionString } from "./cloudflare-db-env";

/**
 * Resolve the Neon/Postgres connection string for the current runtime.
 *
 * - Cloudflare Workers (deployed): use a Neon-backed Hyperdrive binding.
 * - Node/local/dev/build scripts: fall back to `process.env.DATABASE_URL`.
 *
 * This must not rely on `process.env.DATABASE_URL` inside the Workers runtime.
 * The Cloudflare-only binding module is loaded lazily so Node/local runtimes can
 * continue using `DATABASE_URL` or the PGLite fallback.
 */

export async function getRuntimePostgresUrl(): Promise<string | undefined> {
  const workerUrl = getHyperdriveConnectionString();
  if (workerUrl) return workerUrl;

  const raw =
    typeof process !== "undefined" ? process.env?.DATABASE_URL : undefined;
  const url = raw?.trim();
  return url || undefined;
}

/** Synchronous best-effort resolver for Node contexts (scripts/local dev). */
export function getNodeDatabaseUrl(): string | undefined {
  const raw =
    typeof process !== "undefined" ? process.env?.DATABASE_URL : undefined;
  const url = raw?.trim();
  return url || undefined;
}
