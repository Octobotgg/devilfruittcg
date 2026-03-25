import "next/dist/compiled/server-only/empty.js";

import postgres from "postgres";

const databaseUrl =
  process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;

export function createPostgresClient(connectionString = databaseUrl) {
  if (!connectionString) {
    throw new Error(
      "Set DATABASE_URL or SUPABASE_DB_URL before creating a Postgres client.",
    );
  }

  return postgres(connectionString);
}
