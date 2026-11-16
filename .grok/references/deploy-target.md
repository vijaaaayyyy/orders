# Build & deploy target

This project deploys to **Cloudflare Workers** with Wrangler and the Cloudflare
Vite plugin. Use `npm run deploy`; it applies database migrations, builds the
Worker, then deploys it. Do not deploy this project through Vercel.

The migration step requires `DATABASE_URL` in the deploy environment. Configure
it as a secret in the build/deploy environment and point it at the same Neon
database as the `HYPERDRIVE` binding in `wrangler.jsonc`. The Worker itself uses
Hyperdrive at runtime; it does not read `DATABASE_URL`. Never commit either
connection string or put it in a browser-visible `VITE_*` variable.

`npm run build` is for building and validating locally; it does not migrate or
deploy. `npm run db:migrate` skips when no `DATABASE_URL` is set, while
`npm run db:migrate:required` fails clearly if the migration connection is
missing. Local preview without a Neon URL uses PGLite.

## Production checks

A passing `npm run build` does not prove that the Worker can connect to its
database. Confirm the Cloudflare Worker has the `HYPERDRIVE` binding configured
and that deployment uses `npm run deploy`. If a page reports missing tables,
confirm the deploy environment's `DATABASE_URL` targets the same database as
Hyperdrive and that migration output reports the schema as applied.

After source changes, run `npm run build` before testing the production output.
The Cloudflare Vite plugin must remain first in `vite.config.ts`; retain the
`grokPwaPlugin()` and app environment plugin integrations.
