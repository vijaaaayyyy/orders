/**
 * Resolve the Neon/Postgres connection string for the current runtime.
 *
 * - Cloudflare Workers (deployed): use a Neon-backed Hyperdrive binding.
 * - Vercel and Node/local/dev/build scripts: fall back to `process.env.DATABASE_URL`.
 *
 * This must not rely on `process.env.DATABASE_URL` inside the Workers runtime.
 * The Cloudflare-only binding module is loaded lazily so Node/local runtimes can
 * continue using `DATABASE_URL` or the PGLite fallback.
 */

export async function getRuntimePostgresUrl(): Promise<string | undefined> {
  // Wrangler dev requires a Hyperdrive local string even when no database runs locally,
  // so dev ignores the binding and uses the PGLite fallback.
  if (!import.meta.env.DEV) {
    const { getHyperdriveConnectionString } = await import("@/lib/cloudflare-db-env");
    const workerUrl = getHyperdriveConnectionString();
    if (workerUrl) return workerUrl;
  }

  return getNodeDatabaseUrl();
}

/** Synchronous best-effort resolver for Node contexts (scripts/local dev). */
export function getNodeDatabaseUrl(): string | undefined {
  // Local dev always uses embedded PGLite so a stale DATABASE_URL cannot break the preview.
  if (import.meta.env?.DEV) return undefined;
  const raw =
    typeof process !== "undefined" ? process.env?.DATABASE_URL : undefined;
  const url = raw?.trim();
  return url || undefined;
}
