/* eslint-disable no-console */
const FEATURED_IDS = [
  "OP01-120", "OP01-001", "OP09-118", "OP02-001", "OP01-061", "OP06-007",
  "OP02-001", "OP09-118", "OP01-120", "OP01-061",
];

const baseCandidates = ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"];

async function fetchWithTimeout(url, ms = 8000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function resolveBase() {
  for (const base of baseCandidates) {
    try {
      const res = await fetchWithTimeout(`${base}/api/cards?q=luffy&pageSize=1`, 5000);
      if (res.ok) return base;
    } catch {}
  }
  throw new Error("No local dev server found on 3000/3001/3002");
}

function uniq(ids) {
  return [...new Set(ids.filter(Boolean))];
}

async function getSetSamples(base, setCode, pageSize = 30) {
  try {
    const res = await fetchWithTimeout(`${base}/api/cards?set=${encodeURIComponent(setCode)}&pageSize=${pageSize}`, 12000);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.results || []).map((c) => c.id).filter(Boolean);
  } catch {
    return [];
  }
}

async function backfillCard(base, cardId) {
  const res = await fetchWithTimeout(`${base}/api/market?id=${encodeURIComponent(cardId)}`, 20000);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
}

async function run() {
  const base = await resolveBase();
  console.log(`Using API base: ${base}`);

  const featured = FEATURED_IDS;
  const op13 = await getSetSamples(base, "OP13", 36);
  const op14 = await getSetSamples(base, "OP14", 36);
  const eb02 = await getSetSamples(base, "EB02", 24);

  const targetIds = uniq([...featured, ...op13, ...op14, ...eb02]).slice(0, 90);
  console.log(`Backfilling ${targetIds.length} cards...`);

  let ok = 0;
  let fail = 0;

  for (const id of targetIds) {
    try {
      const data = await backfillCard(base, id);
      ok++;
      const avg = data?.ebay?.averagePrice;
      console.log(`✅ ${id} -> avg ${typeof avg === "number" ? `$${avg.toFixed(2)}` : "n/a"}`);
    } catch (e) {
      fail++;
      console.log(`❌ ${id} -> ${String(e)}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`Done. success=${ok} failed=${fail}`);
  if (ok === 0) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
