import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

test("resolvePostgresConnectionString falls back to DATABASE_URL when SUPABASE_DB_URL is blank", async () => {
  const mod = await importModule<typeof import("../db/postgres.ts")>("db/postgres.ts");

  const connectionString = mod.resolvePostgresConnectionString({
    env: {
      SUPABASE_DB_URL: "",
      DATABASE_URL: "postgres://example-db",
    },
  });

  assert.equal(connectionString, "postgres://example-db");
});
