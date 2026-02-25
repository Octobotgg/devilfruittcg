// Script to parse Japanese card data from official OPTCG website
// This will generate TypeScript card files for each set

const fs = require('fs');
const path = require('path');

// Parse card ID to extract set code and number
function parseCardId(id) {
  const match = id.match(/(OP\d+|ST\d+)-(\d+)/i);
  if (!match) return null;
  return {
    setCode: match[1].toUpperCase(),
    number: match[2]
  };
}

// Color mapping from Japanese to English
const colorMap = {
  '赤': 'Red',
  '緑': 'Green',
  '青': 'Blue',
  '紫': 'Purple',
  '黒': 'Black',
  '黄': 'Yellow',
  '赤/青': 'Red/Blue',
  '赤/黒': 'Red/Black',
  '赤/黄': 'Red/Yellow',
  '緑/紫': 'Green/Purple',
  '緑/青': 'Green/Blue',
  '緑/黒': 'Green/Black',
  '青/黒': 'Blue/Black',
  '青/黄': 'Blue/Yellow',
  '紫/黄': 'Purple/Yellow',
  '紫/黒': 'Purple/Black'
};

// Rarity mapping
const rarityMap = {
  'L': 'L',
  'C': 'C',
  'UC': 'UC',
  'R': 'R',
  'SR': 'SR',
  'SEC': 'SEC',
  'SPカード': 'SP'
};

// Type mapping
const typeMap = {
  'LEADER': 'Leader',
  'CHARACTER': 'Character',
  'EVENT': 'Event',
  'STAGE': 'Stage'
};

// Set name mapping
const setNames = {
  'OP01': 'Romance Dawn',
  'OP02': 'Paramount War',
  'OP03': 'Pillars of Strength',
  'OP04': 'Kingdoms of Intrigue',
  'OP05': 'Awakening of the New Era',
  'OP06': 'Wings of the Captain',
  'OP07': '500 Years in the Future',
  'OP08': 'Two Legends',
  'ST01': 'Straw Hat Crew',
  'ST02': 'Worst Generation',
  'ST03': 'The Seven Warlords of the Sea',
  'ST04': 'Animal Kingdom Pirates',
  'ST05': 'ONE PIECE FILM edition',
  'ST06': 'Navy',
  'ST07': 'Big Mom Pirates',
  'ST08': 'Monkey D. Luffy',
  'ST09': 'Yamato',
  'ST10': 'The Three Captains',
  'ST11': 'Uta',
  'ST12': 'Zoro & Sanji',
  'ST13': 'The Three Brothers',
  'ST14': '3D2Y',
  'ST15': 'Red & Green',
  'ST16': 'Blue & Purple',
  'ST17': 'Black & Yellow',
  'ST18': 'Green & Black',
  'ST19': 'Red & Yellow',
  'ST20': 'Purple & Yellow'
};

// Parse a card entry from the raw text
function parseCardEntry(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  // Find card ID line
  const idLine = lines.find(l => l.match(/^(OP|ST)\d+-\d+/i));
  if (!idLine) return null;
  
  const idParts = parseCardId(idLine.split('|')[0].trim());
  if (!idParts) return null;
  
  // Find rarity
  const rarityMatch = idLine.match(/\|\s*(L|C|UC|R|SR|SEC|SPカード)\s*\|/);
  const rarity = rarityMatch ? rarityMap[rarityMatch[1]] || rarityMatch[1] : 'C';
  
  // Find type
  const typeMatch = idLine.match(/\|\s*(LEADER|CHARACTER|EVENT|STAGE)\s*$/);
  const type = typeMatch ? typeMap[typeMatch[1]] || typeMatch[1] : 'Character';
  
  // Find name (usually the line after ID)
  const nameIndex = lines.findIndex(l => l === idLine) + 1;
  const name = nameIndex < lines.length ? lines[nameIndex] : '';
  
  // Find cost (コスト)
  const costMatch = text.match(/### コスト\s*(\d+)/);
  const cost = costMatch ? parseInt(costMatch[1]) : undefined;
  
  // Find power (パワー)
  const powerMatch = text.match(/### パワー\s*(\d+)/);
  const power = powerMatch ? parseInt(powerMatch[1]) : undefined;
  
  // Find color (色)
  const colorMatch = text.match(/### 色\s*\n\s*(.+)/);
  const color = colorMatch ? colorMap[colorMatch[1].trim()] || colorMatch[1].trim() : undefined;
  
  // Find attribute (属性) - represents the card's attribute/trait
  const attrMatch = text.match(/### 特徴\s*\n\s*(.+)/);
  const attribute = attrMatch ? attrMatch[1].trim() : undefined;
  
  return {
    id: `${idParts.setCode}-${idParts.number}`,
    name: name,
    set: setNames[idParts.setCode] || idParts.setCode,
    setCode: idParts.setCode,
    number: idParts.number,
    type: type,
    color: color || 'Red',
    rarity: rarity,
    cost: cost,
    power: power,
    attribute: attribute
  };
}

// Process raw card data from a set
function processSet(rawText, setCode) {
  const cards = [];
  const seen = new Set();
  
  // Split by "CARD VIEW" to get individual cards
  const entries = rawText.split('CARD VIEW');
  
  for (const entry of entries) {
    const card = parseCardEntry(entry);
    if (card && !seen.has(card.id)) {
      seen.add(card.id);
      cards.push(card);
    }
  }
  
  return cards;
}

// Generate TypeScript file for a set
function generateSetFile(cards, setCode) {
  const setName = setNames[setCode] || setCode;
  const varName = `OP${setCode.replace('OP', '')}_CARDS`;
  
  let ts = `import { Card } from "./cards";

// ${setName} - ${cards.length} cards
export const ${varName}: Card[] = [
`;

  for (const card of cards) {
    ts += `  {
    id: "${card.id}",
    name: "${card.name}",
    set: "${card.set}",
    setCode: "${card.setCode}",
    number: "${card.number}",
    type: "${card.type}",
    color: "${card.color}",
    rarity: "${card.rarity}"${card.cost !== undefined ? `,
    cost: ${card.cost}` : ''}${card.power !== undefined ? `,
    power: ${card.power}` : ''}${card.attribute ? `,
    attribute: "${card.attribute}"` : ''}
  },
`;
  }

  ts += `];
`;

  return ts;
}

// Main execution
function main() {
  // Read raw data files (would be populated from web scraping)
  const dataDir = './raw-data';
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // For now, create template files for manual population
  const sets = ['OP02', 'OP03', 'OP04', 'OP05', 'OP06', 'OP07', 'OP08'];
  
  for (const set of sets) {
    const outputFile = path.join('./lib', `${set.toLowerCase()}-cards.ts`);
    
    // Check if we have raw data for this set
    const rawFile = path.join(dataDir, `${set}.txt`);
    
    if (fs.existsSync(rawFile)) {
      const rawText = fs.readFileSync(rawFile, 'utf8');
      const cards = processSet(rawText, set);
      
      if (cards.length > 0) {
        const ts = generateSetFile(cards, set);
        fs.writeFileSync(outputFile, ts);
        console.log(`Generated ${outputFile} with ${cards.length} cards`);
      } else {
        console.log(`No cards parsed for ${set}`);
      }
    } else {
      console.log(`No raw data found for ${set}, creating template`);
      // Create template
      const template = `import { Card } from "./cards";

// ${setNames[set] || set} - cards to be added
export const ${set}_CARDS: Card[] = [
  // Add cards here
];
`;
      fs.writeFileSync(outputFile, template);
    }
  }
}

module.exports = { parseCardEntry, processSet, generateSetFile };

// Run if called directly
if (require.main === module) {
  main();
}
