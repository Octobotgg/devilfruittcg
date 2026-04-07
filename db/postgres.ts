import postgres from "postgres";
import type { Sql } from "postgres";

type PostgresCache = {
  defaultClients: Map<string, Sql>;
};

type PostgresEnv = {
  DATABASE_URL?: string | undefined;
  SUPABASE_DB_URL?: string | undefined;
};

type ResolvePostgresConnectionStringOptions = {
  connectionString?: string | undefined;
  env?: PostgresEnv | undefined;
};

declare global {
  var __devilfruitPostgresCache__: PostgresCache | undefined;
}

function getPostgresCache(): PostgresCache {
  if (!globalThis.__devilfruitPostgresCache__) {
    globalThis.__devilfruitPostgresCache__ = {
      defaultClients: new Map<string, Sql>(),
    };
  }

  return globalThis.__devilfruitPostgresCache__;
}

export function resolvePostgresConnectionString(
  options: ResolvePostgresConnectionStringOptions = {},
) {
  const explicitConnectionString = options.connectionString?.trim();
  if (explicitConnectionString) return explicitConnectionString;

  const env = options.env ?? process.env;
  const supabaseConnectionString = env.SUPABASE_DB_URL?.trim();
  if (supabaseConnectionString) return supabaseConnectionString;

  const databaseConnectionString = env.DATABASE_URL?.trim();
  if (databaseConnectionString) return databaseConnectionString;

  return undefined;
}

export function createPostgresClient(connectionString?: string) {
  const databaseUrl = resolvePostgresConnectionString({ connectionString });

  if (!databaseUrl) {
    throw new Error(
      "Set DATABASE_URL or SUPABASE_DB_URL before creating a Postgres client.",
    );
  }

  if (connectionString) {
    return postgres(databaseUrl);
  }

  const cache = getPostgresCache();
  const cachedClient = cache.defaultClients.get(databaseUrl);
  if (cachedClient) {
    return cachedClient;
  }

  const client = postgres(databaseUrl);
  cache.defaultClients.set(databaseUrl, client);
  return client;
}
