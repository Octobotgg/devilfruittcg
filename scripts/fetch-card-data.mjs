#!/usr/bin/env node
/**
 * Fetch real OPTCG card data from coko7/vegapull-records
 * and regenerate all set TypeScript files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIB_DIR = path.join(__dirname, '..', 'lib');
const BASE_URL = 'https://raw.githubusercontent.com/coko7/vegapull-records/main/data/english';

// Pack ID → set code mapping
const PACK_MAP = {
  '569101': { code: 'OP01', name: 'Romance Dawn' },
  '569102': { code: 'OP02', name: 'Paramount War' },
  '569103': { code: 'OP03', name: 'Pillars of Strength' },
  '569104': { code: 'OP04', name: 'Kingdoms of Intrigue' },
  '569105': { code: 'OP05', name: 'Awakening of the New Era' },
  '569106': { code: 'OP06', name: 'Wings of the Captain' },
  '569107': { code: 'OP07', name: '500 Years in the Future' },
  '569108': { code: 'OP08', name: 'Two Legends' },
  '569109': { code: 'OP09', name: 'Emperors in the New World' },
  '569110': { code: 'OP10', name: 'Royal Blood' },
  '569001': { code: 'ST01', name: 'Straw Hat Crew' },
  '569002': { code: 'ST02', name: 'Worst Generation' },
  '569003': { code: 'ST03', name: 'The Seven Warlords of the Sea' },
  '569004': { code: 'ST04', name: 'Animal Kingdom Pirates' },
  '569005': { code: 'ST05', name: 'ONE PIECE FILM edition' },
  '569006': { code: 'ST06', name: 'Absolute Justice' },
  '569007': { code: 'ST07', name: 'Big Mom Pirates' },
  '569008': { code: 'ST08', name: 'Monkey D. Luffy' },
  '569009': { code: 'ST09', name: 'Yamato' },
  '569010': { code: 'ST10', name: 'The Three Captains' },
  '569011': { code: 'ST11', name: 'Uta' },
  '569012': { code: 'ST12', name: 'Zoro and Sanji' },
  '569013': { code: 'ST13', name: 'The Three Brothers' },
  '569014': { code: 'ST14', name: '3D2Y' },
  '569015': { code: 'ST15', name: 'Red Edward Newgate' },
  '569016': { code: 'ST16', name: 'Green Uta' },
  '569017': { code: 'ST17', name: 'Blue Donquixote Doflamingo' },
  '569018': { code: 'ST18', name: 'Purple Monkey D. Luffy' },
  '569019': { code: 'ST19', name: 'Black Smoker' },
  '569020': { code: 'ST20', name: 'Yellow Charlotte Katakuri' },
  '569021': { code: 'ST21', name: 'GEAR5' },
  '569201': { code: 'EB01', name: 'Memorial Collection' },
  '569202': { code: 'EB02', name: 'Anime 25th Collection' },
};

const RARITY_MAP = {
  'Leader': 'L',
  'Common': 'C',
  'Uncommon': 'UC',
  'Rare': 'R',
  'Super Rare': 'SR',
  'Secret Rare': 'SEC',
  'Special': 'SP',
  'Premium': 'P',
  'Rare (Leader)': 'L',
};

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function convertCard(raw, setInfo) {
  // Skip alternate arts and promos with _p variants
  if (raw.id.includes('_p') || raw.id.includes('_P')) return null;
  // Skip cards from other sets that appear as reprints in this pack
  const setCode = setInfo.code;
  if (!raw.id.startsWith(setCode + '-')) return null;

  const colors = raw.colors && raw.colors.length > 0
    ? raw.colors.join('/')
    : 'Colorless';

  const attribute = raw.attributes && raw.attributes.length > 0
    ? raw.attributes[0]
    : undefined;

  const number = raw.id.split('-').pop()?.replace(/^0+/, '') || '';
  const paddedNum = number.padStart(3, '0');

  return {
    id: raw.id,
    name: raw.name,
    set: setInfo.name,
    setCode,
    number: paddedNum,
    type: raw.category || 'Character',
    color: colors,
    rarity: RARITY_MAP[raw.rarity] || raw.rarity || 'C',
    ...(raw.cost != null ? { cost: raw.cost } : {}),
    ...(raw.power != null ? { power: raw.power } : {}),
    ...(attribute ? { attribute } : {}),
  };
}

function generateTsFile(setCode, setName, cards) {
  const varName = setCode.replace('-', '_').toUpperCase() + '_CARDS';
  const lines = cards.map(c => {
    const parts = [];
    parts.push(`id: "${c.id}"`);
    parts.push(`name: ${JSON.stringify(c.name)}`);
    parts.push(`set: ${JSON.stringify(c.set)}`);
    parts.push(`setCode: "${c.setCode}"`);
    parts.push(`number: "${c.number}"`);
    parts.push(`type: "${c.type}"`);
    parts.push(`color: "${c.color}"`);
    parts.push(`rarity: "${c.rarity}"`);
    if (c.cost != null) parts.push(`cost: ${c.cost}`);
    if (c.power != null) parts.push(`power: ${c.power}`);
    if (c.attribute) parts.push(`attribute: "${c.attribute}"`);
    return `  { ${parts.join(', ')} },`;
  });

  return `import type { Card } from './cards';

const ${varName}: Card[] = [
${lines.join('\n')}
];

export default ${varName};
`;
}

async function main() {
  console.log('Fetching packs list...');
  const packs = await fetchJson(`${BASE_URL}/packs.json`);
  console.log(`Found ${packs.length} packs`);

  const allCards = new Map(); // setCode → Card[]

  for (const pack of packs) {
    const setInfo = PACK_MAP[pack.id];
    if (!setInfo) {
      console.log(`  Skipping pack ${pack.id} (${pack.raw_title}) - not in map`);
      continue;
    }

    console.log(`Fetching ${setInfo.code} (${setInfo.name})...`);
    try {
      const rawCards = await fetchJson(`${BASE_URL}/cards_${pack.id}.json`);
      const cards = rawCards
        .map(c => convertCard(c, setInfo))
        .filter(Boolean);

      if (cards.length > 0) {
        allCards.set(setInfo.code, cards);
        console.log(`  → ${cards.length} cards`);
      } else {
        console.log(`  → 0 cards (all filtered)`);
      }
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
    }
  }

  // Write TypeScript files
  for (const [setCode, cards] of allCards) {
    if (cards.length === 0) continue;
    const filename = setCode.toLowerCase().replace(/(\d+)$/, n => n.padStart(2, '0')) + '-cards.ts';
    const outPath = path.join(LIB_DIR, filename);
    const content = generateTsFile(setCode, cards[0].set, cards);
    fs.writeFileSync(outPath, content);
    console.log(`Wrote ${outPath} (${cards.length} cards)`);
  }

  console.log('\nDone! Summary:');
  let total = 0;
  for (const [code, cards] of allCards) {
    console.log(`  ${code}: ${cards.length} cards`);
    total += cards.length;
  }
  console.log(`  TOTAL: ${total} cards`);
}

main().catch(console.error);
