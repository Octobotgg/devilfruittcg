import postgres from "postgres";

export function createPostgresClient(connectionString?: string) {
  const databaseUrl =
    connectionString ?? process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;

  if (!databaseUrl) {
    throw new Error(
      "Set DATABASE_URL or SUPABASE_DB_URL before creating a Postgres client.",
    );
  }

  return postgres(databaseUrl);
}
