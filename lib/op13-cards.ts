// OP13: The Golden City - Complete card list
const OP13_CARDS = [
  // Leaders
  { id: "OP13-001", name: "Gol.D.Roger", set: "The Golden City", setCode: "OP13", number: "001", type: "Leader", color: "Red/Yellow", rarity: "L" },
  { id: "OP13-002", name: "Silvers Rayleigh", set: "The Golden City", setCode: "OP13", number: "002", type: "Leader", color: "Yellow", rarity: "L" },
  { id: "OP13-003", name: "Crocus", set: "The Golden City", setCode: "OP13", number: "003", type: "Leader", color: "Blue", rarity: "L" },
  { id: "OP13-004", name: "Shiki", set: "The Golden City", setCode: "OP13", number: "004", type: "Leader", color: "Purple", rarity: "L" },
  { id: "OP13-005", name: "Scopper Gaban", set: "The Golden City", setCode: "OP13", number: "005", type: "Leader", color: "Red", rarity: "L" },
  { id: "OP13-006", name: "Seagull", set: "The Golden City", setCode: "OP13", number: "006", type: "Leader", color: "Blue", rarity: "L" },
  
  // Characters SR
  { id: "OP13-007", name: "Gol.D.Roger", set: "The Golden City", setCode: "OP13", number: "007", type: "Character", color: "Red", rarity: "SR", cost: 9, power: 10000 },
  { id: "OP13-008", name: "Silvers Rayleigh", set: "The Golden City", setCode: "OP13", number: "008", type: "Character", color: "Yellow", rarity: "SR", cost: 5, power: 7000 },
  { id: "OP13-009", name: "Crocus", set: "The Golden City", setCode: "OP13", number: "009", type: "Character", color: "Blue", rarity: "SR", cost: 3, power: 4000 },
  { id: "OP13-010", name: "Shiki", set: "The Golden City", setCode: "OP13", number: "010", type: "Character", color: "Purple", rarity: "SR", cost: 7, power: 9000 },
  { id: "OP13-011", name: "Scopper Gaban", set: "The Golden City", setCode: "OP13", number: "011", type: "Character", color: "Red", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP13-012", name: "Seagull", set: "The Golden City", setCode: "OP13", number: "012", type: "Character", color: "Blue", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP13-013", name: "Kozuki Oden", set: "The Golden City", setCode: "OP13", number: "013", type: "Character", color: "Red", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP13-014", name: "Gan Fall", set: "The Golden City", setCode: "OP13", number: "014", type: "Character", color: "Blue", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP13-015", name: "Wyper", set: "The Golden City", setCode: "OP13", number: "015", type: "Character", color: "Blue", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP13-016", name: "Kamakiri", set: "The Golden City", setCode: "OP13", number: "016", type: "Character", color: "Blue", rarity: "SR", cost: 3, power: 4000 },
  { id: "OP13-017", name: "Genbo", set: "The Golden City", setCode: "OP13", number: "017", type: "Character", color: "Blue", rarity: "SR", cost: 3, power: 4000 },
  { id: "OP13-018", name: "Braham", set: "The Golden City", setCode: "OP13", number: "018", type: "Character", color: "Blue", rarity: "SR", cost: 3, power: 3000 },
  { id: "OP13-019", name: "Raki", set: "The Golden City", setCode: "OP13", number: "019", type: "Character", color: "Blue", rarity: "SR", cost: 2, power: 2000 },
  { id: "OP13-020", name: "Aisa", set: "The Golden City", setCode: "OP13", number: "020", type: "Character", color: "Blue", rarity: "SR", cost: 1, power: 0 },
  
  // Characters R
  { id: "OP13-021", name: "Buggy", set: "The Golden City", setCode: "OP13", number: "021", type: "Character", color: "Red", rarity: "R", cost: 2, power: 2000 },
  { id: "OP13-022", name: "Drake", set: "The Golden City", setCode: "OP13", number: "022", type: "Character", color: "Blue", rarity: "R", cost: 4, power: 5000 },
  { id: "OP13-023", name: "Trafalgar Law", set: "The Golden City", setCode: "OP13", number: "023", type: "Character", color: "Blue", rarity: "R", cost: 3, power: 3000 },
  { id: "OP13-024", name: "Eustass Kid", set: "The Golden City", setCode: "OP13", number: "024", type: "Character", color: "Red", rarity: "R", cost: 3, power: 3000 },
  { id: "OP13-025", name: "Heat", set: "The Golden City", setCode: "OP13", number: "025", type: "Character", color: "Red", rarity: "R", cost: 2, power: 2000 },
  { id: "OP13-026", name: "Wire", set: "The Golden City", setCode: "OP13", number: "026", type: "Character", color: "Red", rarity: "R", cost: 2, power: 2000 },
  { id: "OP13-027", name: "Killer", set: "The Golden City", setCode: "OP13", number: "027", type: "Character", color: "Blue", rarity: "R", cost: 2, power: 2000 },
  { id: "OP13-028", name: "Basil Hawkins", set: "The Golden City", setCode: "OP13", number: "028", type: "Character", color: "Purple", rarity: "R", cost: 4, power: 5000 },
  { id: "OP13-029", name: "Scratchmen Apoo", set: "The Golden City", setCode: "OP13", number: "029", type: "Character", color: "Purple", rarity: "R", cost: 3, power: 3000 },
  { id: "OP13-030", name: "Urouge", set: "The Golden City", setCode: "OP13", number: "030", type: "Character", color: "Purple", rarity: "R", cost: 4, power: 5000 },
  { id: "OP13-031", name: "Capone Gang Bege", set: "The Golden City", setCode: "OP13", number: "031", type: "Character", color: "Purple", rarity: "R", cost: 4, power: 5000 },
  { id: "OP13-032", name: "Jewelry Bonney", set: "The Golden City", setCode: "OP13", number: "032", type: "Character", color: "Purple", rarity: "R", cost: 3, power: 3000 },
  { id: "OP13-033", name: "X Drake", set: "The Golden City", setCode: "OP13", number: "033", type: "Character", color: "Purple", rarity: "R", cost: 4, power: 5000 },
  { id: "OP13-034", name: "Roronoa Zoro", set: "The Golden City", setCode: "OP13", number: "034", type: "Character", color: "Red", rarity: "R", cost: 4, power: 5000 },
  { id: "OP13-035", name: "Sanji", set: "The Golden City", setCode: "OP13", number: "035", type: "Character", color: "Red", rarity: "R", cost: 4, power: 6000 },
  { id: "OP13-036", name: "Nami", set: "The Golden City", setCode: "OP13", number: "036", type: "Character", color: "Red", rarity: "R", cost: 2, power: 2000 },
  { id: "OP13-037", name: "Usopp", set: "The Golden City", setCode: "OP13", number: "037", type: "Character", color: "Red", rarity: "R", cost: 2, power: 1000 },
  { id: "OP13-038", name: "Tony Tony Chopper", set: "The Golden City", setCode: "OP13", number: "038", type: "Character", color: "Red", rarity: "R", cost: 1, power: 1000 },
  { id: "OP13-039", name: "Nico Robin", set: "The Golden City", setCode: "OP13", number: "039", type: "Character", color: "Red", rarity: "R", cost: 3, power: 3000 },
  { id: "OP13-040", name: "Franky", set: "The Golden City", setCode: "OP13", number: "040", type: "Character", color: "Red", rarity: "R", cost: 4, power: 5000 },
  
  // Characters UC
  { id: "OP13-041", name: "Brook", set: "The Golden City", setCode: "OP13", number: "041", type: "Character", color: "Red", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP13-042", name: "Jinbe", set: "The Golden City", setCode: "OP13", number: "042", type: "Character", color: "Red", rarity: "UC", cost: 4, power: 5000 },
  { id: "OP13-043", name: "Inuarashi", set: "The Golden City", setCode: "OP13", number: "043", type: "Character", color: "Red", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP13-044", name: "Nekomamushi", set: "The Golden City", setCode: "OP13", number: "044", type: "Character", color: "Red", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP13-045", name: "Kawamatsu", set: "The Golden City", setCode: "OP13", number: "045", type: "Character", color: "Blue", rarity: "UC", cost: 2, power: 3000 },
  { id: "OP13-046", name: "Denjiro", set: "The Golden City", setCode: "OP13", number: "046", type: "Character", color: "Blue", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP13-047", name: "Ashura Doji", set: "The Golden City", setCode: "OP13", number: "047", type: "Character", color: "Blue", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP13-048", name: "Kin'emon", set: "The Golden City", setCode: "OP13", number: "048", type: "Character", color: "Red", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP13-049", name: "Raizo", set: "The Golden City", setCode: "OP13", number: "049", type: "Character", color: "Blue", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP13-050", name: "Kiku", set: "The Golden City", setCode: "OP13", number: "050", type: "Character", color: "Blue", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP13-051", name: "Izou", set: "The Golden City", setCode: "OP13", number: "051", type: "Character", color: "Blue", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP13-052", name: "Shinobu", set: "The Golden City", setCode: "OP13", number: "052", type: "Character", color: "Blue", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP13-053", name: "Hyogoro", set: "The Golden City", setCode: "OP13", number: "053", type: "Character", color: "Blue", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP13-054", name: "O-Tama", set: "The Golden City", setCode: "OP13", number: "054", type: "Character", color: "Red", rarity: "UC", cost: 1, power: 0 },
  { id: "OP13-055", name: "Carrot", set: "The Golden City", setCode: "OP13", number: "055", type: "Character", color: "Red", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP13-056", name: "Pedro", set: "The Golden City", setCode: "OP13", number: "056", type: "Character", color: "Red", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP13-057", name: "Pekoms", set: "The Golden City", setCode: "OP13", number: "057", type: "Character", color: "Red", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP13-058", name: "Bepo", set: "The Golden City", setCode: "OP13", number: "058", type: "Character", color: "Blue", rarity: "UC", cost: 2, power: 2000 },
  
  // Events
  { id: "OP13-059", name: "Divine Departure", set: "The Golden City", setCode: "OP13", number: "059", type: "Event", color: "Red", rarity: "R", cost: 2 },
  { id: "OP13-060", name: "Kamusari", set: "The Golden City", setCode: "OP13", number: "060", type: "Event", color: "Red", rarity: "R", cost: 2 },
  { id: "OP13-061", name: "The Pirate King", set: "The Golden City", setCode: "OP13", number: "061", type: "Event", color: "Yellow", rarity: "R", cost: 1 },
  { id: "OP13-062", name: "Dark King's Wrath", set: "The Golden City", setCode: "OP13", number: "062", type: "Event", color: "Yellow", rarity: "R", cost: 2 },
  { id: "OP13-063", name: "Requiem", set: "The Golden City", setCode: "OP13", number: "063", type: "Event", color: "Purple", rarity: "R", cost: 2 },
  { id: "OP13-064", name: "Lion's Song", set: "The Golden City", setCode: "OP13", number: "064", type: "Event", color: "Purple", rarity: "R", cost: 1 },
  { id: "OP13-065", name: "Reject", set: "The Golden City", setCode: "OP13", number: "065", type: "Event", color: "Blue", rarity: "R", cost: 1 },
  
  // Stages
  { id: "OP13-066", name: "Skypiea", set: "The Golden City", setCode: "OP13", number: "066", type: "Stage", color: "Blue", rarity: "C", cost: 1 },
  { id: "OP13-067", name: "Upper Yard", set: "The Golden City", setCode: "OP13", number: "067", type: "Stage", color: "Blue", rarity: "C", cost: 2 },
  { id: "OP13-068", name: "Angel Island", set: "The Golden City", setCode: "OP13", number: "068", type: "Stage", color: "Blue", rarity: "C", cost: 1 },
  
  // Secret Rares
  { id: "OP13-069", name: "Gol.D.Roger", set: "The Golden City", setCode: "OP13", number: "069", type: "Character", color: "Red", rarity: "SEC", cost: 10, power: 12000 },
  { id: "OP13-070", name: "Silvers Rayleigh", set: "The Golden City", setCode: "OP13", number: "070", type: "Character", color: "Yellow", rarity: "SEC", cost: 6, power: 8000 },
  { id: "OP13-071", name: "Shiki", set: "The Golden City", setCode: "OP13", number: "071", type: "Character", color: "Purple", rarity: "SEC", cost: 8, power: 10000 },
  { id: "OP13-072", name: "Kozuki Oden", set: "The Golden City", setCode: "OP13", number: "072", type: "Character", color: "Red", rarity: "SEC", cost: 6, power: 7000 },
];


export default OP13_CARDS;
