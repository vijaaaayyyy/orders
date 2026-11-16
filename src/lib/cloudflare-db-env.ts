import { env } from "cloudflare:workers";

export function getHyperdriveConnectionString(): string | undefined {
  return env.HYPERDRIVE?.connectionString?.trim() || undefined;
}
