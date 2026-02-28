/* eslint-disable no-console */
const baseCandidates = ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"];

async function resolveBase() {
  for (const base of baseCandidates) {
    try {
      const res = await fetch(`${base}/api/cards?q=luffy&pageSize=1`);
      if (res.ok) return base;
    } catch {}
  }
  throw new Error("No local dev server found on 3000/3001/3002");
}

async function run() {
  const base = await resolveBase();
  const targets = [
    `${base}/api/market?card=OP01-001`,
    `${base}/api/market?card=OP05-001`,
    `${base}/api/cards?q=shanks&pageSize=5`,
  ];

  let failed = 0;
  for (const url of targets) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (url.includes('/api/market')) {
        if (!json?.ebay?.sales || !Array.isArray(json.ebay.sales)) throw new Error('bad market shape');
      }
      if (url.includes('/api/cards')) {
        if (!Array.isArray(json?.results)) throw new Error('bad cards shape');
      }
      console.log(`✅ ${url}`);
    } catch (e) {
      failed++;
      console.error(`❌ ${url} -> ${String(e)}`);
    }
  }

  if (failed) process.exit(1);
  console.log('✅ smoke-market passed');
}

run();
