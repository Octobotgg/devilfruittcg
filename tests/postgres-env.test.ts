import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

test("postgres env resolution prefers SUPABASE_DB_URL over DATABASE_URL", async () => {
  const postgresModule =
    await importModule<typeof import("../db/postgres")>("db/postgres.ts");

  assert.equal(typeof postgresModule.resolvePostgresConnectionString, "function");
  assert.equal(
    postgresModule.resolvePostgresConnectionString({
      env: {
        DATABASE_URL: "postgres://platform-injected",
        SUPABASE_DB_URL: "postgres://supabase-primary",
      },
    }),
    "postgres://supabase-primary",
  );
  assert.equal(
    postgresModule.resolvePostgresConnectionString({
      env: {
        DATABASE_URL: "postgres://platform-injected",
      },
    }),
    "postgres://platform-injected",
  );
  assert.equal(
    postgresModule.resolvePostgresConnectionString({
      connectionString: "postgres://explicit-override",
      env: {
        DATABASE_URL: "postgres://platform-injected",
        SUPABASE_DB_URL: "postgres://supabase-primary",
      },
    }),
    "postgres://explicit-override",
  );
});
