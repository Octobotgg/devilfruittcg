/* eslint-disable no-console */
const FEED_URL = process.env.CARD_FEED_URL || "https://optcgdb.com/api/cards.json";

function mapFeedCard(raw) {
  const id = String(raw.cardid || raw.cardId || raw.id || raw.number || "").trim();
  if (!id) return null;
  const setCode = String(raw.setcode || raw.setCode || raw.set || raw.setid || "").trim().toUpperCase();
  const number = String(raw.number || raw.no || "").trim();
  const setName = String(raw.setname || raw.setName || raw.set || "").trim();
  const name = String(raw.name || "").trim();
  const imageUrl = raw.image || raw.img || raw.imageurl || raw.imageUrl || raw.image_url || undefined;
  return { id, setCode, number, set: setName, name, imageUrl };
}

function normalizeNum(n) {
  return String(n || "").replace(/^0+/, "") || "0";
}

function validateCard(card) {
  const issues = [];
  if (!card.id) issues.push("missing_id");
  if (!card.name) issues.push("missing_name");

  const m = /^([A-Z0-9]+)-([0-9]{1,4})$/i.exec(card.id || "");
  if (!m) {
    issues.push("bad_id_format");
    return issues;
  }

  const prefix = m[1].toUpperCase();
  const idNum = m[2];

  if (card.setCode && card.setCode !== prefix) issues.push("setcode_mismatch");
  if (card.number && normalizeNum(card.number) !== normalizeNum(idNum)) issues.push("number_mismatch");
  if (!card.imageUrl) issues.push("missing_image_url");

  return issues;
}

async function main() {
  const res = await fetch(FEED_URL);
  if (!res.ok) {
    console.error(`Feed fetch failed: ${res.status}`);
    process.exit(1);
  }
  const json = await res.json();
  const raw = Array.isArray(json) ? json : json.cards || [];
  const mapped = raw.map(mapFeedCard).filter(Boolean);

  const conflicts = new Map(); // id -> Set(names)
  const byId = new Map();

  for (const c of mapped) {
    if (!conflicts.has(c.id)) conflicts.set(c.id, new Set());
    conflicts.get(c.id).add(c.name);
    if (!byId.has(c.id)) byId.set(c.id, c);
  }

  const unique = [...byId.values()];

  let totalIssues = 0;
  const issueCounts = {};
  const sample = [];

  for (const c of unique) {
    const issues = validateCard(c);
    if (!issues.length) continue;
    totalIssues += issues.length;
    for (const i of issues) issueCounts[i] = (issueCounts[i] || 0) + 1;
    if (sample.length < 30) sample.push({ id: c.id, name: c.name, issues });
  }

  const nameConflicts = [...conflicts.entries()]
    .filter(([, names]) => names.size > 1)
    .map(([id, names]) => ({ id, names: [...names] }));

  const report = {
    feedUrl: FEED_URL,
    rawCount: raw.length,
    uniqueCount: unique.length,
    issueCounts,
    totalIssues,
    nameConflictCount: nameConflicts.length,
    sampleIssues: sample,
    sampleNameConflicts: nameConflicts.slice(0, 20),
    consistencyPass: totalIssues === 0 && nameConflicts.length === 0,
  };

  console.log(JSON.stringify(report, null, 2));

  if (!report.consistencyPass) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
