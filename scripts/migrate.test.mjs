import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const migrator = fileURLToPath(new URL("./migrate.mjs", import.meta.url));

function runMigrator(args) {
  const env = { ...process.env };
  delete env.DATABASE_URL;
  return spawnSync(process.execPath, [migrator, ...args], {
    encoding: "utf8",
    env,
  });
}

test("deployment migration fails when DATABASE_URL is missing", () => {
  const result = runMigrator(["--required"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL is required for deployment migrations/);
});

test("local migration skips cleanly when DATABASE_URL is missing", () => {
  const result = runMigrator([]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /skipping local migration/);
});
