import { Card } from "./cards";

// Pillars of Strength (OP03) - Key cards
const OP03_CARDS: Card[] = [
  // Leaders
  { id: "OP03-001", name: "Kaido", set: "Pillars of Strength", setCode: "OP03", number: "001", type: "Leader", color: "Purple", rarity: "L", cost: 0, power: 5000 },
  { id: "OP03-002", name: "Nami", set: "Pillars of Strength", setCode: "OP03", number: "002", type: "Leader", color: "Blue/Red", rarity: "L", cost: 0, power: 5000 },
  { id: "OP03-003", name: "Rob Lucci", set: "Pillars of Strength", setCode: "OP03", number: "003", type: "Leader", color: "Black", rarity: "L", cost: 0, power: 5000 },
  { id: "OP03-004", name: "Rebecca", set: "Pillars of Strength", setCode: "OP03", number: "004", type: "Leader", color: "Black", rarity: "L", cost: 0, power: 5000 },
  { id: "OP03-005", name: "Gecko Moria", set: "Pillars of Strength", setCode: "OP03", number: "005", type: "Leader", color: "Purple", rarity: "L", cost: 0, power: 5000 },
  { id: "OP03-006", name: "Kozuki Oden", set: "Pillars of Strength", setCode: "OP03", number: "006", type: "Leader", color: "Green/Blue", rarity: "L", cost: 0, power: 5000 },
  
  // Purple Cards (Beast Pirates)
  { id: "OP03-007", name: "Black Maria", set: "Pillars of Strength", setCode: "OP03", number: "007", type: "Character", color: "Purple", rarity: "R", cost: 4, power: 5000 },
  { id: "OP03-008", name: "Ulti", set: "Pillars of Strength", setCode: "OP03", number: "008", type: "Character", color: "Purple", rarity: "R", cost: 3, power: 4000 },
  { id: "OP03-009", name: "Who's-Who", set: "Pillars of Strength", setCode: "OP03", number: "009", type: "Character", color: "Purple", rarity: "C", cost: 3, power: 4000 },
  { id: "OP03-010", name: "Sasaki", set: "Pillars of Strength", setCode: "OP03", number: "010", type: "Character", color: "Purple", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP03-011", name: "Page One", set: "Pillars of Strength", setCode: "OP03", number: "011", type: "Character", color: "Purple", rarity: "C", cost: 3, power: 4000 },
  { id: "OP03-012", name: "Kaido", set: "Pillars of Strength", setCode: "OP03", number: "012", type: "Character", color: "Purple", rarity: "SR", cost: 10, power: 12000 },
  { id: "OP03-013", name: "King", set: "Pillars of Strength", setCode: "OP03", number: "013", type: "Character", color: "Purple", rarity: "SR", cost: 7, power: 7000 },
  { id: "OP03-014", name: "Queen", set: "Pillars of Strength", setCode: "OP03", number: "014", type: "Character", color: "Purple", rarity: "R", cost: 5, power: 6000 },
  { id: "OP03-015", name: "Jack", set: "Pillars of Strength", setCode: "OP03", number: "015", type: "Character", color: "Purple", rarity: "R", cost: 4, power: 5000 },
  { id: "OP03-016", name: "X Drake", set: "Pillars of Strength", setCode: "OP03", number: "016", type: "Character", color: "Purple", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP03-017", name: "Babanuki", set: "Pillars of Strength", setCode: "OP03", number: "017", type: "Character", color: "Purple", rarity: "C", cost: 4, power: 5000 },
  { id: "OP03-018", name: "Daifugo", set: "Pillars of Strength", setCode: "OP03", number: "018", type: "Character", color: "Purple", rarity: "C", cost: 3, power: 4000 },
  { id: "OP03-019", name: "Solitaire", set: "Pillars of Strength", setCode: "OP03", number: "019", type: "Character", color: "Purple", rarity: "C", cost: 3, power: 4000 },
  { id: "OP03-020", name: "Onigashima", set: "Pillars of Strength", setCode: "OP03", number: "020", type: "Stage", color: "Purple", rarity: "R", cost: 1 },
  { id: "OP03-021", name: "Thunder Bagua", set: "Pillars of Strength", setCode: "OP03", number: "021", type: "Event", color: "Purple", rarity: "R", cost: 2 },
  
  // Blue Cards (Big Mom Pirates)
  { id: "OP03-022", name: "Charlotte Katakuri", set: "Pillars of Strength", setCode: "OP03", number: "022", type: "Character", color: "Blue", rarity: "SR", cost: 7, power: 7000 },
  { id: "OP03-023", name: "Charlotte Smoothie", set: "Pillars of Strength", setCode: "OP03", number: "023", type: "Character", color: "Blue", rarity: "R", cost: 5, power: 6000 },
  { id: "OP03-024", name: "Charlotte Cracker", set: "Pillars of Strength", setCode: "OP03", number: "024", type: "Character", color: "Blue", rarity: "R", cost: 5, power: 6000 },
  { id: "OP03-025", name: "Charlotte Perospero", set: "Pillars of Strength", setCode: "OP03", number: "025", type: "Character", color: "Blue", rarity: "UC", cost: 4, power: 5000 },
  { id: "OP03-026", name: "Charlotte Pudding", set: "Pillars of Strength", setCode: "OP03", number: "026", type: "Character", color: "Blue", rarity: "C", cost: 2, power: 3000 },
  { id: "OP03-027", name: "Whole Cake Island", set: "Pillars of Strength", setCode: "OP03", number: "027", type: "Stage", color: "Blue", rarity: "R", cost: 1 },
  { id: "OP03-028", name: "Thousand Sunny", set: "Pillars of Strength", setCode: "OP03", number: "028", type: "Stage", color: "Blue", rarity: "R", cost: 2 },
  
  // Green/Blue Cards (Oden)
  { id: "OP03-029", name: "Kouzuki Oden", set: "Pillars of Strength", setCode: "OP03", number: "029", type: "Character", color: "Green", rarity: "SR", cost: 8, power: 9000 },
  { id: "OP03-030", name: "Kin'emon", set: "Pillars of Strength", setCode: "OP03", number: "030", type: "Character", color: "Green", rarity: "R", cost: 5, power: 6000 },
  { id: "OP03-031", name: "Denjiro", set: "Pillars of Strength", setCode: "OP03", number: "031", type: "Character", color: "Green", rarity: "R", cost: 4, power: 5000 },
  { id: "OP03-032", name: "Ashura Doji", set: "Pillars of Strength", setCode: "OP03", number: "032", type: "Character", color: "Green", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP03-033", name: "Inuarashi", set: "Pillars of Strength", setCode: "OP03", number: "033", type: "Character", color: "Green", rarity: "R", cost: 5, power: 6000 },
  { id: "OP03-034", name: "Nekomamushi", set: "Pillars of Strength", setCode: "OP03", number: "034", type: "Character", color: "Green", rarity: "R", cost: 5, power: 6000 },
  { id: "OP03-035", name: "Raizo", set: "Pillars of Strength", setCode: "OP03", number: "035", type: "Character", color: "Green", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP03-036", name: "Kikunojo", set: "Pillars of Strength", setCode: "OP03", number: "036", type: "Character", color: "Green", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP03-037", name: "Kawamatsu", set: "Pillars of Strength", setCode: "OP03", number: "037", type: "Character", color: "Green", rarity: "C", cost: 3, power: 4000 },
  { id: "OP03-038", name: "Kouzuki Momonosuke", set: "Pillars of Strength", setCode: "OP03", number: "038", type: "Character", color: "Green", rarity: "C", cost: 1, power: 0 },
  { id: "OP03-039", name: "Oden's Castle", set: "Pillars of Strength", setCode: "OP03", number: "039", type: "Stage", color: "Green", rarity: "R", cost: 1 },
  
  // Black Cards (CP9/CP0)
  { id: "OP03-040", name: "Rob Lucci", set: "Pillars of Strength", setCode: "OP03", number: "040", type: "Character", color: "Black", rarity: "SR", cost: 6, power: 7000 },
  { id: "OP03-041", name: "Kaku", set: "Pillars of Strength", setCode: "OP03", number: "041", type: "Character", color: "Black", rarity: "R", cost: 4, power: 5000 },
  { id: "OP03-042", name: "Jabra", set: "Pillars of Strength", setCode: "OP03", number: "042", type: "Character", color: "Black", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP03-043", name: "Blueno", set: "Pillars of Strength", setCode: "OP03", number: "043", type: "Character", color: "Black", rarity: "C", cost: 3, power: 4000 },
  { id: "OP03-044", name: "Kalifa", set: "Pillars of Strength", setCode: "OP03", number: "044", type: "Character", color: "Black", rarity: "C", cost: 3, power: 4000 },
  { id: "OP03-045", name: "Fukurou", set: "Pillars of Strength", setCode: "OP03", number: "045", type: "Character", color: "Black", rarity: "C", cost: 2, power: 3000 },
  { id: "OP03-046", name: "Kumadori", set: "Pillars of Strength", setCode: "OP03", number: "046", type: "Character", color: "Black", rarity: "C", cost: 2, power: 3000 },
  { id: "OP03-047", name: "Spandam", set: "Pillars of Strength", setCode: "OP03", number: "047", type: "Character", color: "Black", rarity: "C", cost: 1, power: 2000 },
  { id: "OP03-048", name: "Hattori", set: "Pillars of Strength", setCode: "OP03", number: "048", type: "Character", color: "Black", rarity: "C", cost: 1, power: 0 },
  { id: "OP03-049", name: "Enies Lobby", set: "Pillars of Strength", setCode: "OP03", number: "049", type: "Stage", color: "Black", rarity: "R", cost: 1 },
  
  // Secret Rares
  { id: "OP03-050", name: "Charlotte Linlin (Big Mom)", set: "Pillars of Strength", setCode: "OP03", number: "050", type: "Character", color: "Blue", rarity: "SEC", cost: 10, power: 12000 },
  { id: "OP03-051", name: "Rob Lucci", set: "Pillars of Strength", setCode: "OP03", number: "051", type: "Character", color: "Black", rarity: "SEC", cost: 6, power: 7000 },
  { id: "OP03-052", name: "Kaido", set: "Pillars of Strength", setCode: "OP03", number: "052", type: "Character", color: "Purple", rarity: "SEC", cost: 10, power: 12000 },
  { id: "OP03-053", name: "Kouzuki Oden", set: "Pillars of Strength", setCode: "OP03", number: "053", type: "Character", color: "Green", rarity: "SEC", cost: 8, power: 9000 },
  { id: "OP03-054", name: "Nami", set: "Pillars of Strength", setCode: "OP03", number: "054", type: "Character", color: "Blue", rarity: "SEC", cost: 3, power: 5000 },
  { id: "OP03-055", name: "Rebecca", set: "Pillars of Strength", setCode: "OP03", number: "055", type: "Character", color: "Black", rarity: "SEC", cost: 4, power: 5000 }
];

export default OP03_CARDS;
