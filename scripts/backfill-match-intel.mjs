const baseUrl = (process.env.MATCH_INTEL_SYNC_URL || "https://devilfruittcg.gg").replace(/\/$/, "");
const authKey = process.env.MATCH_INTEL_SYNC_KEY || process.env.CRON_SECRET || "";
const totalDays = Math.max(1, Math.min(Number(process.env.MATCH_INTEL_BACKFILL_TOTAL_DAYS || 180), 720));
const chunkDays = Math.max(1, Math.min(Number(process.env.MATCH_INTEL_BACKFILL_CHUNK_DAYS || 14), 60));
const periods = (process.env.MATCH_INTEL_BACKFILL_PERIODS || "").trim();

if (!authKey) {
  console.error("Missing MATCH_INTEL_SYNC_KEY (or CRON_SECRET) for match-intel backfill.");
  process.exit(1);
}

function addUtcDays(date, delta) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + delta);
  return next;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function triggerBackfill(days, endDate) {
  const url = new URL("/api/matchhistory/sync", baseUrl);
  url.searchParams.set("mode", "backfill");
  url.searchParams.set("days", String(days));
  url.searchParams.set("endDate", endDate);
  if (periods) url.searchParams.set("periods", periods);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authKey}`,
      "Content-Type": "application/json",
      "User-Agent": "DevilFruitTCG/MatchIntelBackfill",
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || `Backfill failed (${response.status})`);
  }

  return payload;
}

async function main() {
  const startedAt = new Date();
  let remaining = totalDays;
  let cursor = new Date();

  console.log(`Starting match-intel backfill against ${baseUrl}`);
  console.log(`Total days: ${totalDays}, chunk size: ${chunkDays}, periods: ${periods || "default"}`);

  while (remaining > 0) {
    const currentChunk = Math.min(chunkDays, remaining);
    const endDate = toIsoDate(cursor);
    console.log(`Syncing ${currentChunk} day chunk ending ${endDate}...`);

    const payload = await triggerBackfill(currentChunk, endDate);
    console.log(
      JSON.stringify(
        {
          endDate,
          currentChunk,
          snapshotsUpserted: payload?.totals?.snapshotsUpserted ?? 0,
          leaderRowsUpserted: payload?.totals?.leaderRowsUpserted ?? 0,
          matchupRowsUpserted: payload?.totals?.matchupRowsUpserted ?? 0,
          errors: payload?.totals?.errors ?? 0,
        },
        null,
        2
      )
    );

    remaining -= currentChunk;
    cursor = addUtcDays(cursor, -currentChunk);
    if (remaining > 0) await sleep(1000);
  }

  console.log(`Match-intel backfill finished in ${Math.round((Date.now() - startedAt.getTime()) / 1000)}s`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
