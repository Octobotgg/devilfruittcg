import type { MatchIntelPeriod } from "@/lib/analytics/types";
import { MATCH_INTEL_PERIODS } from "@/lib/analytics/types";
import { createMatchIntelSupabaseRepository } from "@/lib/analytics/repository";
import { fetchExternalSnapshotBridgeForDate } from "@/lib/sources/external-snapshot-bridge";
import { getOfficialCardById } from "@/lib/official-cards";

export type MatchIntelSyncMode = "incremental" | "backfill";

export interface MatchIntelSyncPeriodResult {
  period: MatchIntelPeriod;
  mode: MatchIntelSyncMode;
  latestStoredDate: string | null;
  requestedDates: string[];
  syncedDates: string[];
  missingDates: string[];
  snapshotsUpserted: number;
  leaderRowsUpserted: number;
  matchupRowsUpserted: number;
  errors: string[];
}

export interface MatchIntelSyncResult {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  mode: MatchIntelSyncMode;
  periods: MatchIntelSyncPeriodResult[];
  totals: {
    snapshotsUpserted: number;
    leaderRowsUpserted: number;
    matchupRowsUpserted: number;
    errors: number;
  };
}

type SyncLogger = (message: string, meta?: Record<string, unknown>) => void;

export interface MatchIntelSyncOptions {
  mode?: MatchIntelSyncMode;
  periods?: MatchIntelPeriod[];
  days?: number;
  endDate?: Date;
  requestPauseMs?: number;
  bootstrapDays?: number;
  retryAttempts?: number;
  retryBaseDelayMs?: number;
  logger?: SyncLogger;
}

function addUtcDays(date: Date, delta: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + delta);
  return next;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function fromIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function sleep(ms: number) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function classifySyncError(error: unknown) {
  if (error instanceof Error) {
    const base: Record<string, unknown> = {
      name: error.name,
      message: error.message,
    };

    const anyError = error as Error & {
      code?: string;
      status?: number;
      details?: unknown;
      hint?: unknown;
      cause?: unknown;
    };

    if (anyError.code) base.code = anyError.code;
    if (typeof anyError.status === "number") base.status = anyError.status;
    if (anyError.details != null) base.details = anyError.details;
    if (anyError.hint != null) base.hint = anyError.hint;

    if (anyError.cause && typeof anyError.cause === "object") {
      const cause = anyError.cause as { code?: string; status?: number; message?: string };
      if (cause.code) base.causeCode = cause.code;
      if (typeof cause.status === "number") base.causeStatus = cause.status;
      if (cause.message) base.causeMessage = cause.message;
    }

    return base;
  }

  return { message: String(error) };
}

function snapshotStats(period: MatchIntelPeriod, requestDate: string, snapshot: NonNullable<Awaited<ReturnType<typeof fetchExternalSnapshotBridgeForDate>>>["snapshot"]) {
  const uniqueLeaderIds = new Set<string>();
  const unmatchedLeaderIds = new Set<string>();
  const uniqueMatchupPairs = new Set<string>();

  for (const leader of snapshot.leaders) {
    uniqueLeaderIds.add(leader.leader_id);
    if (!getOfficialCardById(leader.leader_id)) unmatchedLeaderIds.add(leader.leader_id);
  }

  for (const matchup of snapshot.matchups) {
    uniqueLeaderIds.add(matchup.leader_id);
    uniqueLeaderIds.add(matchup.opponent_id);
    uniqueMatchupPairs.add(`${matchup.leader_id}__${matchup.opponent_id}`);
    if (!getOfficialCardById(matchup.leader_id)) unmatchedLeaderIds.add(matchup.leader_id);
    if (!getOfficialCardById(matchup.opponent_id)) unmatchedLeaderIds.add(matchup.opponent_id);
  }

  return {
    period,
    requestDate,
    snapshotDate: snapshot.snapshotDate,
    rawLeaderRows: snapshot.leaders.length,
    rawMatchupRows: snapshot.matchups.length,
    uniqueLeadersMatched: uniqueLeaderIds.size - unmatchedLeaderIds.size,
    uniqueLeadersSeen: uniqueLeaderIds.size,
    uniqueMatchupPairs: uniqueMatchupPairs.size,
    unmatchedLeaderCount: unmatchedLeaderIds.size,
    unmatchedLeaderIds: [...unmatchedLeaderIds].sort().slice(0, 20),
  };
}

function parsePeriods(periods?: MatchIntelPeriod[]): MatchIntelPeriod[] {
  if (periods?.length) return [...new Set(periods)];

  const raw = (process.env.MATCH_INTEL_SYNC_PERIODS || "").trim();
  if (!raw) return [...MATCH_INTEL_PERIODS];

  const requested = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return MATCH_INTEL_PERIODS.filter((period) => requested.includes(period));
}

function normalizePositiveInt(value: number | undefined, fallback: number, min: number, max: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value as number)));
}

function readDefaultPauseMs() {
  return normalizePositiveInt(Number(process.env.MATCH_INTEL_SYNC_PAUSE_MS || 1000), 1000, 0, 5000);
}

function readDefaultBootstrapDays() {
  return normalizePositiveInt(Number(process.env.MATCH_INTEL_SYNC_BOOTSTRAP_DAYS || 14), 14, 1, 90);
}

function readRetryAttempts() {
  return normalizePositiveInt(Number(process.env.MATCH_INTEL_SYNC_RETRY_ATTEMPTS || 3), 3, 1, 5);
}

function readRetryBaseDelayMs() {
  return normalizePositiveInt(Number(process.env.MATCH_INTEL_SYNC_RETRY_DELAY_MS || 500), 500, 100, 5000);
}

function getRequestedDates(
  mode: MatchIntelSyncMode,
  latestStoredDate: string | null,
  endDate: Date,
  days: number,
  bootstrapDays: number
): Date[] {
  const end = startOfUtcDay(endDate);

  if (mode === "backfill") {
    const start = addUtcDays(end, -(days - 1));
    const dates: Date[] = [];
    for (let cursor = start; cursor <= end; cursor = addUtcDays(cursor, 1)) {
      dates.push(cursor);
    }
    return dates;
  }

  if (latestStoredDate) {
    const start = addUtcDays(fromIsoDate(latestStoredDate), 1);
    const dates: Date[] = [];
    for (let cursor = start; cursor <= end; cursor = addUtcDays(cursor, 1)) {
      dates.push(cursor);
    }
    return dates;
  }

  const start = addUtcDays(end, -(bootstrapDays - 1));
  const dates: Date[] = [];
  for (let cursor = start; cursor <= end; cursor = addUtcDays(cursor, 1)) {
    dates.push(cursor);
  }
  return dates;
}

export function isMatchIntelSyncConfigured(): boolean {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(supabaseUrl && serviceRoleKey && process.env.MATCH_INTEL_SNAPSHOT_BASE_URL);
}

export async function syncMatchIntelSnapshots(options: MatchIntelSyncOptions = {}): Promise<MatchIntelSyncResult> {
  const startedAtDate = new Date();
  const startedAt = startedAtDate.toISOString();
  const logger: SyncLogger =
    options.logger ||
    ((message, meta) => {
      console.info(`[match-intel-sync] ${message}`, meta || {});
    });

  const mode = options.mode || "incremental";
  const periods = parsePeriods(options.periods);
  const endDate = startOfUtcDay(options.endDate || new Date());
  const requestPauseMs = normalizePositiveInt(options.requestPauseMs, readDefaultPauseMs(), 0, 5000);
  const bootstrapDays = normalizePositiveInt(options.bootstrapDays, readDefaultBootstrapDays(), 1, 90);
  const days = normalizePositiveInt(options.days, mode === "backfill" ? 14 : bootstrapDays, 1, 180);
  const retryAttempts = normalizePositiveInt(options.retryAttempts, readRetryAttempts(), 1, 5);
  const retryBaseDelayMs = normalizePositiveInt(options.retryBaseDelayMs, readRetryBaseDelayMs(), 100, 5000);

  if (!periods.length) {
    throw new Error("No match-intel periods configured");
  }

  const repo = createMatchIntelSupabaseRepository();
  const periodResults: MatchIntelSyncPeriodResult[] = [];

  logger("sync_start", { mode, periods, endDate: endDate.toISOString(), days });

  for (const period of periods) {
    const latestStoredDate = (await repo.getRecentSnapshotDates(period, 1))[0] || null;
    const requestedDates = getRequestedDates(mode, latestStoredDate, endDate, days, bootstrapDays);

    const periodResult: MatchIntelSyncPeriodResult = {
      period,
      mode,
      latestStoredDate,
      requestedDates: requestedDates.map(toIsoDate),
      syncedDates: [],
      missingDates: [],
      snapshotsUpserted: 0,
      leaderRowsUpserted: 0,
      matchupRowsUpserted: 0,
      errors: [],
    };

    logger("period_start", {
      period,
      mode,
      latestStoredDate,
      requestedDates: periodResult.requestedDates,
    });

    for (let index = 0; index < requestedDates.length; index++) {
      const date = requestedDates[index];
      if (index > 0) await sleep(requestPauseMs);

      const requestDate = toIsoDate(date);

      try {
        const snapshot = await fetchExternalSnapshotBridgeForDate(period, date, { throwOnError: true, revalidateSeconds: 0 });
        if (!snapshot?.snapshot) {
          logger("snapshot_missing", { period, requestDate });
          periodResult.missingDates.push(requestDate);
          continue;
        }

        logger("snapshot_loaded", snapshotStats(period, requestDate, snapshot.snapshot));

        const leaderRows = await repo.upsertLeaderDailyStats(snapshot.snapshot.leaders);
        const matchupRows = await repo.upsertLeaderMatchupDailyStats(snapshot.snapshot.matchups);

        logger("snapshot_upserted", {
          period,
          requestDate,
          snapshotDate: snapshot.snapshot.snapshotDate,
          leaderRowsUpserted: leaderRows,
          matchupRowsUpserted: matchupRows,
        });

        periodResult.syncedDates.push(snapshot.snapshot.snapshotDate);
        periodResult.snapshotsUpserted += 1;
        periodResult.leaderRowsUpserted += leaderRows;
        periodResult.matchupRowsUpserted += matchupRows;
      } catch (error) {
        let recovered = false;

        logger("snapshot_sync_error", {
          period,
          requestDate,
          attempt: 1,
          ...classifySyncError(error),
        });

        for (let attempt = 2; attempt <= retryAttempts; attempt++) {
          try {
            const retryDelayMs = retryBaseDelayMs * 2 ** (attempt - 2);
            logger("snapshot_retrying", {
              period,
              requestDate,
              attempt,
              retryDelayMs,
            });
            await sleep(retryDelayMs);
            const snapshot = await fetchExternalSnapshotBridgeForDate(period, date, { throwOnError: true, revalidateSeconds: 0 });
            if (!snapshot?.snapshot) {
              logger("snapshot_missing", { period, requestDate, attempt });
              periodResult.missingDates.push(requestDate);
              recovered = true;
              break;
            }

            logger("snapshot_loaded", {
              ...snapshotStats(period, requestDate, snapshot.snapshot),
              attempt,
            });

            const leaderRows = await repo.upsertLeaderDailyStats(snapshot.snapshot.leaders);
            const matchupRows = await repo.upsertLeaderMatchupDailyStats(snapshot.snapshot.matchups);

            logger("snapshot_upserted", {
              period,
              requestDate,
              snapshotDate: snapshot.snapshot.snapshotDate,
              attempt,
              leaderRowsUpserted: leaderRows,
              matchupRowsUpserted: matchupRows,
            });

            periodResult.syncedDates.push(snapshot.snapshot.snapshotDate);
            periodResult.snapshotsUpserted += 1;
            periodResult.leaderRowsUpserted += leaderRows;
            periodResult.matchupRowsUpserted += matchupRows;
            recovered = true;
            break;
          } catch (retryError) {
            logger("snapshot_sync_error", {
              period,
              requestDate,
              attempt,
              ...classifySyncError(retryError),
            });
            if (attempt === retryAttempts) {
              periodResult.errors.push(
                `Failed ${period} ${requestDate}: ${retryError instanceof Error ? retryError.message : String(retryError)}`
              );
            }
          }
        }

        if (!recovered && retryAttempts <= 1) {
          periodResult.errors.push(`Failed ${period} ${requestDate}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    logger("period_complete", {
      period,
      syncedDates: periodResult.syncedDates.length,
      missingDates: periodResult.missingDates.length,
      errors: periodResult.errors.length,
    });
    periodResults.push(periodResult);
  }

  const finishedAtDate = new Date();
  const result: MatchIntelSyncResult = {
    startedAt,
    finishedAt: finishedAtDate.toISOString(),
    durationMs: finishedAtDate.getTime() - startedAtDate.getTime(),
    mode,
    periods: periodResults,
    totals: {
      snapshotsUpserted: periodResults.reduce((sum, row) => sum + row.snapshotsUpserted, 0),
      leaderRowsUpserted: periodResults.reduce((sum, row) => sum + row.leaderRowsUpserted, 0),
      matchupRowsUpserted: periodResults.reduce((sum, row) => sum + row.matchupRowsUpserted, 0),
      errors: periodResults.reduce((sum, row) => sum + row.errors.length, 0),
    },
  };

  logger("sync_complete", result.totals);
  return result;
}
