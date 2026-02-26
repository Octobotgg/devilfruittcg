// OP10: Royal Blood - Complete card list
const OP10_CARDS = [
  // Leaders
  { id: "OP10-001", name: "Nefertari Vivi", set: "Royal Blood", setCode: "OP10", number: "001", type: "Leader", color: "Blue/Yellow", rarity: "L" },
  { id: "OP10-002", name: "Nico Robin", set: "Royal Blood", setCode: "OP10", number: "002", type: "Leader", color: "Purple/Blue", rarity: "L" },
  { id: "OP10-003", name: "Rebecca", set: "Royal Blood", setCode: "OP10", number: "003", type: "Leader", color: "Blue", rarity: "L" },
  { id: "OP10-004", name: "Viola", set: "Royal Blood", setCode: "OP10", number: "004", type: "Leader", color: "Blue", rarity: "L" },
  { id: "OP10-005", name: "Donquixote Doflamingo", set: "Royal Blood", setCode: "OP10", number: "005", type: "Leader", color: "Purple", rarity: "L" },
  { id: "OP10-006", name: "Kyros", set: "Royal Blood", setCode: "OP10", number: "006", type: "Leader", color: "Blue", rarity: "L" },
  
  // Characters SR
  { id: "OP10-007", name: "Nefertari Vivi", set: "Royal Blood", setCode: "OP10", number: "007", type: "Character", color: "Blue", rarity: "SR", cost: 3, power: 4000 },
  { id: "OP10-008", name: "Nico Robin", set: "Royal Blood", setCode: "OP10", number: "008", type: "Character", color: "Purple", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP10-009", name: "Rebecca", set: "Royal Blood", setCode: "OP10", number: "009", type: "Character", color: "Blue", rarity: "SR", cost: 3, power: 3000 },
  { id: "OP10-010", name: "Viola", set: "Royal Blood", setCode: "OP10", number: "010", type: "Character", color: "Blue", rarity: "SR", cost: 3, power: 3000 },
  { id: "OP10-011", name: "Donquixote Doflamingo", set: "Royal Blood", setCode: "OP10", number: "011", type: "Character", color: "Purple", rarity: "SR", cost: 7, power: 9000 },
  { id: "OP10-012", name: "Kyros", set: "Royal Blood", setCode: "OP10", number: "012", type: "Character", color: "Blue", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP10-013", name: "Cavendish", set: "Royal Blood", setCode: "OP10", number: "013", type: "Character", color: "Blue", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP10-014", name: "Bartolomeo", set: "Royal Blood", setCode: "OP10", number: "014", type: "Character", color: "Blue", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP10-015", name: "Sai", set: "Royal Blood", setCode: "OP10", number: "015", type: "Character", color: "Blue", rarity: "SR", cost: 3, power: 4000 },
  { id: "OP10-016", name: "Ideo", set: "Royal Blood", setCode: "OP10", number: "016", type: "Character", color: "Blue", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP10-017", name: "Hajrudin", set: "Royal Blood", setCode: "OP10", number: "017", type: "Character", color: "Blue", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP10-018", name: "Elizabello II", set: "Royal Blood", setCode: "OP10", number: "018", type: "Character", color: "Blue", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP10-019", name: "Donquixote Rosinante", set: "Royal Blood", setCode: "OP10", number: "019", type: "Character", color: "Purple", rarity: "SR", cost: 4, power: 4000 },
  { id: "OP10-020", name: "Trebol", set: "Royal Blood", setCode: "OP10", number: "020", type: "Character", color: "Purple", rarity: "SR", cost: 3, power: 3000 },
  
  // Characters R
  { id: "OP10-021", name: "Karoo", set: "Royal Blood", setCode: "OP10", number: "021", type: "Character", color: "Blue", rarity: "R", cost: 1, power: 1000 },
  { id: "OP10-022", name: "Chaka", set: "Royal Blood", setCode: "OP10", number: "022", type: "Character", color: "Blue", rarity: "R", cost: 3, power: 3000 },
  { id: "OP10-023", name: "Pell", set: "Royal Blood", setCode: "OP10", number: "023", type: "Character", color: "Blue", rarity: "R", cost: 3, power: 4000 },
  { id: "OP10-024", name: "Igaram", set: "Royal Blood", setCode: "OP10", number: "024", type: "Character", color: "Blue", rarity: "R", cost: 2, power: 2000 },
  { id: "OP10-025", name: "Kohza", set: "Royal Blood", setCode: "OP10", number: "025", type: "Character", color: "Blue", rarity: "R", cost: 2, power: 2000 },
  { id: "OP10-026", name: "Tontatta Leo", set: "Royal Blood", setCode: "OP10", number: "026", type: "Character", color: "Blue", rarity: "R", cost: 2, power: 2000 },
  { id: "OP10-027", name: "Tontatta Mansherry", set: "Royal Blood", setCode: "OP10", number: "027", type: "Character", color: "Blue", rarity: "R", cost: 2, power: 1000 },
  { id: "OP10-028", name: "Thunder Soldier", set: "Royal Blood", setCode: "OP10", number: "028", type: "Character", color: "Blue", rarity: "R", cost: 3, power: 3000 },
  { id: "OP10-029", name: "Riku Doldo III", set: "Royal Blood", setCode: "OP10", number: "029", type: "Character", color: "Blue", rarity: "R", cost: 3, power: 3000 },
  { id: "OP10-030", name: "Scarlett", set: "Royal Blood", setCode: "OP10", number: "030", type: "Character", color: "Blue", rarity: "R", cost: 2, power: 2000 },
  { id: "OP10-031", name: "Diamante", set: "Royal Blood", setCode: "OP10", number: "031", type: "Character", color: "Purple", rarity: "R", cost: 4, power: 5000 },
  { id: "OP10-032", name: "Pica", set: "Royal Blood", setCode: "OP10", number: "032", type: "Character", color: "Purple", rarity: "R", cost: 6, power: 6000 },
  { id: "OP10-033", name: "Lao G", set: "Royal Blood", setCode: "OP10", number: "033", type: "Character", color: "Purple", rarity: "R", cost: 3, power: 4000 },
  { id: "OP10-034", name: "Machvise", set: "Royal Blood", setCode: "OP10", number: "034", type: "Character", color: "Purple", rarity: "R", cost: 4, power: 5000 },
  { id: "OP10-035", name: "Señor Pink", set: "Royal Blood", setCode: "OP10", number: "035", type: "Character", color: "Purple", rarity: "R", cost: 3, power: 4000 },
  { id: "OP10-036", name: "Dellinger", set: "Royal Blood", setCode: "OP10", number: "036", type: "Character", color: "Purple", rarity: "R", cost: 2, power: 3000 },
  { id: "OP10-037", name: "Gladius", set: "Royal Blood", setCode: "OP10", number: "037", type: "Character", color: "Purple", rarity: "R", cost: 4, power: 4000 },
  { id: "OP10-038", name: "Baby 5", set: "Royal Blood", setCode: "OP10", number: "038", type: "Character", color: "Purple", rarity: "R", cost: 3, power: 3000 },
  { id: "OP10-039", name: "Buffalo", set: "Royal Blood", setCode: "OP10", number: "039", type: "Character", color: "Purple", rarity: "R", cost: 3, power: 3000 },
  { id: "OP10-040", name: "Sugar", set: "Royal Blood", setCode: "OP10", number: "040", type: "Character", color: "Purple", rarity: "R", cost: 2, power: 1000 },
  
  // Characters UC
  { id: "OP10-041", name: "Gan Fall", set: "Royal Blood", setCode: "OP10", number: "041", type: "Character", color: "Blue", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP10-042", name: "Wyper", set: "Royal Blood", setCode: "OP10", number: "042", type: "Character", color: "Blue", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP10-043", name: "Kamakiri", set: "Royal Blood", setCode: "OP10", number: "043", type: "Character", color: "Blue", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP10-044", name: "Genbo", set: "Royal Blood", setCode: "OP10", number: "044", type: "Character", color: "Blue", rarity: "UC", cost: 2, power: 3000 },
  { id: "OP10-045", name: "Braham", set: "Royal Blood", setCode: "OP10", number: "045", type: "Character", color: "Blue", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP10-046", name: "Raki", set: "Royal Blood", setCode: "OP10", number: "046", type: "Character", color: "Blue", rarity: "UC", cost: 1, power: 1000 },
  { id: "OP10-047", name: "Conis", set: "Royal Blood", setCode: "OP10", number: "047", type: "Character", color: "Blue", rarity: "UC", cost: 1, power: 0 },
  { id: "OP10-048", name: "Aisa", set: "Royal Blood", setCode: "OP10", number: "048", type: "Character", color: "Blue", rarity: "UC", cost: 1, power: 0 },
  { id: "OP10-049", name: "Pagaya", set: "Royal Blood", setCode: "OP10", number: "049", type: "Character", color: "Blue", rarity: "UC", cost: 1, power: 0 },
  { id: "OP10-050", name: "Su", set: "Royal Blood", setCode: "OP10", number: "050", type: "Character", color: "Blue", rarity: "UC", cost: 1, power: 1000 },
  { id: "OP10-051", name: "Farul", set: "Royal Blood", setCode: "OP10", number: "051", type: "Character", color: "Blue", rarity: "UC", cost: 1, power: 0 },
  { id: "OP10-052", name: "Suleiman", set: "Royal Blood", setCode: "OP10", number: "052", type: "Character", color: "Blue", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP10-053", name: "Blue Gilly", set: "Royal Blood", setCode: "OP10", number: "053", type: "Character", color: "Blue", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP10-054", name: "Abdullah", set: "Royal Blood", setCode: "OP10", number: "054", type: "Character", color: "Blue", rarity: "UC", cost: 2, power: 3000 },
  { id: "OP10-055", name: "Jeet", set: "Royal Blood", setCode: "OP10", number: "055", type: "Character", color: "Blue", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP10-056", name: "Orlumbus", set: "Royal Blood", setCode: "OP10", number: "056", type: "Character", color: "Blue", rarity: "UC", cost: 4, power: 5000 },
  { id: "OP10-057", name: "Dagama", set: "Royal Blood", setCode: "OP10", number: "057", type: "Character", color: "Blue", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP10-058", name: "Purple White Beret", set: "Royal Blood", setCode: "OP10", number: "058", type: "Character", color: "Purple", rarity: "UC", cost: 2, power: 2000 },
  
  // Events
  { id: "OP10-059", name: "The Courage to Face", set: "Royal Blood", setCode: "OP10", number: "059", type: "Event", color: "Blue", rarity: "R", cost: 1 },
  { id: "OP10-060", name: "Royal Bloodline", set: "Royal Blood", setCode: "OP10", number: "060", type: "Event", color: "Blue", rarity: "R", cost: 2 },
  { id: "OP10-061", name: "For the Future", set: "Royal Blood", setCode: "OP10", number: "061", type: "Event", color: "Blue", rarity: "R", cost: 1 },
  { id: "OP10-062", name: "Birdcage", set: "Royal Blood", setCode: "OP10", number: "062", type: "Event", color: "Purple", rarity: "R", cost: 2 },
  { id: "OP10-063", name: "Bet on the Future", set: "Royal Blood", setCode: "OP10", number: "063", type: "Event", color: "Purple", rarity: "R", cost: 1 },
  { id: "OP10-064", name: "Yellow Flash", set: "Royal Blood", setCode: "OP10", number: "064", type: "Event", color: "Blue", rarity: "R", cost: 1 },
  { id: "OP10-065", name: "Spiral Hollow", set: "Royal Blood", setCode: "OP10", number: "065", type: "Event", color: "Blue", rarity: "R", cost: 1 },
  
  // Stages
  { id: "OP10-066", name: "Alubarna", set: "Royal Blood", setCode: "OP10", number: "066", type: "Stage", color: "Blue", rarity: "C", cost: 1 },
  { id: "OP10-067", name: "Corrida Colosseum", set: "Royal Blood", setCode: "OP10", number: "067", type: "Stage", color: "Blue", rarity: "C", cost: 2 },
  { id: "OP10-068", name: "Dressrosa", set: "Royal Blood", setCode: "OP10", number: "068", type: "Stage", color: "Purple", rarity: "C", cost: 1 },
  
  // Secret Rares
  { id: "OP10-069", name: "Nefertari Vivi", set: "Royal Blood", setCode: "OP10", number: "069", type: "Character", color: "Blue", rarity: "SEC", cost: 4, power: 6000 },
  { id: "OP10-070", name: "Nico Robin", set: "Royal Blood", setCode: "OP10", number: "070", type: "Character", color: "Purple", rarity: "SEC", cost: 5, power: 7000 },
  { id: "OP10-071", name: "Donquixote Doflamingo", set: "Royal Blood", setCode: "OP10", number: "071", type: "Character", color: "Purple", rarity: "SEC", cost: 8, power: 10000 },
  { id: "OP10-072", name: "Charlotte Linlin", set: "Royal Blood", setCode: "OP10", number: "072", type: "Character", color: "Black", rarity: "SEC", cost: 9, power: 10000 },
];


export default OP10_CARDS;
