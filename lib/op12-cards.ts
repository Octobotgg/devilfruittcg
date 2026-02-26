// OP12: The Three Captains - Complete card list
const OP12_CARDS = [
  // Leaders
  { id: "OP12-001", name: "Monkey D. Luffy", set: "The Three Captains", setCode: "OP12", number: "001", type: "Leader", color: "Red", rarity: "L" },
  { id: "OP12-002", name: "Trafalgar Law", set: "The Three Captains", setCode: "OP12", number: "002", type: "Leader", color: "Blue", rarity: "L" },
  { id: "OP12-003", name: "Eustass Kid", set: "The Three Captains", setCode: "OP12", number: "003", type: "Leader", color: "Red", rarity: "L" },
  { id: "OP12-004", name: "Killer", set: "The Three Captains", setCode: "OP12", number: "004", type: "Leader", color: "Blue", rarity: "L" },
  { id: "OP12-005", name: "Kaido", set: "The Three Captains", setCode: "OP12", number: "005", type: "Leader", color: "Purple", rarity: "L" },
  { id: "OP12-006", name: "Yamato", set: "The Three Captains", setCode: "OP12", number: "006", type: "Leader", color: "Purple", rarity: "L" },
  
  // Characters SR
  { id: "OP12-007", name: "Monkey D. Luffy", set: "The Three Captains", setCode: "OP12", number: "007", type: "Character", color: "Red", rarity: "SR", cost: 9, power: 10000 },
  { id: "OP12-008", name: "Trafalgar Law", set: "The Three Captains", setCode: "OP12", number: "008", type: "Character", color: "Blue", rarity: "SR", cost: 6, power: 7000 },
  { id: "OP12-009", name: "Eustass Kid", set: "The Three Captains", setCode: "OP12", number: "009", type: "Character", color: "Red", rarity: "SR", cost: 7, power: 8000 },
  { id: "OP12-010", name: "Killer", set: "The Three Captains", setCode: "OP12", number: "010", type: "Character", color: "Blue", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP12-011", name: "Kaido", set: "The Three Captains", setCode: "OP12", number: "011", type: "Character", color: "Purple", rarity: "SR", cost: 9, power: 10000 },
  { id: "OP12-012", name: "Yamato", set: "The Three Captains", setCode: "OP12", number: "012", type: "Character", color: "Purple", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP12-013", name: "King", set: "The Three Captains", setCode: "OP12", number: "013", type: "Character", color: "Purple", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP12-014", name: "Queen", set: "The Three Captains", setCode: "OP12", number: "014", type: "Character", color: "Purple", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP12-015", name: "Jack", set: "The Three Captains", setCode: "OP12", number: "015", type: "Character", color: "Purple", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP12-016", name: "Nekomamushi", set: "The Three Captains", setCode: "OP12", number: "016", type: "Character", color: "Red", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP12-017", name: "Inuarashi", set: "The Three Captains", setCode: "OP12", number: "017", type: "Character", color: "Red", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP12-018", name: "Kawamatsu", set: "The Three Captains", setCode: "OP12", number: "018", type: "Character", color: "Blue", rarity: "SR", cost: 3, power: 4000 },
  { id: "OP12-019", name: "Denjiro", set: "The Three Captains", setCode: "OP12", number: "019", type: "Character", color: "Blue", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP12-020", name: "Ashura Doji", set: "The Three Captains", setCode: "OP12", number: "020", type: "Character", color: "Blue", rarity: "SR", cost: 4, power: 5000 },
  
  // Characters R
  { id: "OP12-021", name: "Bepo", set: "The Three Captains", setCode: "OP12", number: "021", type: "Character", color: "Blue", rarity: "R", cost: 2, power: 2000 },
  { id: "OP12-022", name: "Penguin", set: "The Three Captains", setCode: "OP12", number: "022", type: "Character", color: "Blue", rarity: "R", cost: 2, power: 2000 },
  { id: "OP12-023", name: "Shachi", set: "The Three Captains", setCode: "OP12", number: "023", type: "Character", color: "Blue", rarity: "R", cost: 2, power: 2000 },
  { id: "OP12-024", name: "Jean Bart", set: "The Three Captains", setCode: "OP12", number: "024", type: "Character", color: "Blue", rarity: "R", cost: 3, power: 4000 },
  { id: "OP12-025", name: "Heat", set: "The Three Captains", setCode: "OP12", number: "025", type: "Character", color: "Red", rarity: "R", cost: 2, power: 2000 },
  { id: "OP12-026", name: "Wire", set: "The Three Captains", setCode: "OP12", number: "026", type: "Character", color: "Red", rarity: "R", cost: 2, power: 2000 },
  { id: "OP12-027", name: "Gin", set: "The Three Captains", setCode: "OP12", number: "027", type: "Character", color: "Red", rarity: "R", cost: 3, power: 3000 },
  { id: "OP12-028", name: "X Drake", set: "The Three Captains", setCode: "OP12", number: "028", type: "Character", color: "Purple", rarity: "R", cost: 3, power: 4000 },
  { id: "OP12-029", name: "Page One", set: "The Three Captains", setCode: "OP12", number: "029", type: "Character", color: "Purple", rarity: "R", cost: 3, power: 3000 },
  { id: "OP12-030", name: "Ulti", set: "The Three Captains", setCode: "OP12", number: "030", type: "Character", color: "Purple", rarity: "R", cost: 2, power: 2000 },
  { id: "OP12-031", name: "Who's-Who", set: "The Three Captains", setCode: "OP12", number: "031", type: "Character", color: "Purple", rarity: "R", cost: 3, power: 4000 },
  { id: "OP12-032", name: "Sasaki", set: "The Three Captains", setCode: "OP12", number: "032", type: "Character", color: "Purple", rarity: "R", cost: 3, power: 4000 },
  { id: "OP12-033", name: "Black Maria", set: "The Three Captains", setCode: "OP12", number: "033", type: "Character", color: "Purple", rarity: "R", cost: 3, power: 3000 },
  { id: "OP12-034", name: "Kin'emon", set: "The Three Captains", setCode: "OP12", number: "034", type: "Character", color: "Red", rarity: "R", cost: 3, power: 4000 },
  { id: "OP12-035", name: "Raizo", set: "The Three Captains", setCode: "OP12", number: "035", type: "Character", color: "Blue", rarity: "R", cost: 3, power: 3000 },
  { id: "OP12-036", name: "Kiku", set: "The Three Captains", setCode: "OP12", number: "036", type: "Character", color: "Blue", rarity: "R", cost: 3, power: 3000 },
  { id: "OP12-037", name: "Izou", set: "The Three Captains", setCode: "OP12", number: "037", type: "Character", color: "Blue", rarity: "R", cost: 3, power: 3000 },
  { id: "OP12-038", name: "Shinobu", set: "The Three Captains", setCode: "OP12", number: "038", type: "Character", color: "Blue", rarity: "R", cost: 2, power: 2000 },
  { id: "OP12-039", name: "O-Kiku", set: "The Three Captains", setCode: "OP12", number: "039", type: "Character", color: "Blue", rarity: "R", cost: 3, power: 3000 },
  { id: "OP12-040", name: "Hyogoro", set: "The Three Captains", setCode: "OP12", number: "040", type: "Character", color: "Blue", rarity: "R", cost: 2, power: 2000 },
  
  // Continue with UC and other rarities
  { id: "OP12-041", name: "Momonosuke", set: "The Three Captains", setCode: "OP12", number: "041", type: "Character", color: "Red", rarity: "UC", cost: 1, power: 0 },
  { id: "OP12-042", name: "Tama", set: "The Three Captains", setCode: "OP12", number: "042", type: "Character", color: "Red", rarity: "UC", cost: 1, power: 0 },
  { id: "OP12-043", name: "Carrot", set: "The Three Captains", setCode: "OP12", number: "043", type: "Character", color: "Red", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP12-044", name: "Wanda", set: "The Three Captains", setCode: "OP12", number: "044", type: "Character", color: "Red", rarity: "UC", cost: 2, power: 3000 },
  { id: "OP12-045", name: "Pedro", set: "The Three Captains", setCode: "OP12", number: "045", type: "Character", color: "Red", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP12-046", name: "Roddy", set: "The Three Captains", setCode: "OP12", number: "046", type: "Character", color: "Red", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP12-047", name: "Blackback", set: "The Three Captains", setCode: "OP12", number: "047", type: "Character", color: "Red", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP12-048", name: "Shishilian", set: "The Three Captains", setCode: "OP12", number: "048", type: "Character", color: "Red", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP12-049", name: "Concelot", set: "The Three Captains", setCode: "OP12", number: "049", type: "Character", color: "Red", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP12-050", name: "Duke Dogstorm", set: "The Three Captains", setCode: "OP12", number: "050", type: "Character", color: "Red", rarity: "UC", cost: 4, power: 5000 },
  { id: "OP12-051", name: "Master Cat Viper", set: "The Three Captains", setCode: "OP12", number: "051", type: "Character", color: "Red", rarity: "UC", cost: 4, power: 5000 },
  { id: "OP12-052", name: "Sarutobi", set: "The Three Captains", setCode: "OP12", number: "052", type: "Character", color: "Blue", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP12-053", name: "Shinobu", set: "The Three Captains", setCode: "OP12", number: "053", type: "Character", color: "Blue", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP12-054", name: "Onimaru", set: "The Three Captains", setCode: "OP12", number: "054", type: "Character", color: "Blue", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP12-055", name: "Hotei", set: "The Three Captains", setCode: "OP12", number: "055", type: "Character", color: "Blue", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP12-056", name: "Jibuemon", set: "The Three Captains", setCode: "OP12", number: "056", type: "Character", color: "Blue", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP12-057", name: "Kouzuki Oden", set: "The Three Captains", setCode: "OP12", number: "057", type: "Character", color: "Blue", rarity: "UC", cost: 5, power: 6000 },
  { id: "OP12-058", name: "Kouzuki Toki", set: "The Three Captains", setCode: "OP12", number: "058", type: "Character", color: "Blue", rarity: "UC", cost: 2, power: 1000 },
  
  // Events
  { id: "OP12-059", name: "Red Roc", set: "The Three Captains", setCode: "OP12", number: "059", type: "Event", color: "Red", rarity: "R", cost: 2 },
  { id: "OP12-060", name: "Gomu Gomu no Kong Gun", set: "The Three Captains", setCode: "OP12", number: "060", type: "Event", color: "Red", rarity: "R", cost: 2 },
  { id: "OP12-061", name: "Gamma Knife", set: "The Three Captains", setCode: "OP12", number: "061", type: "Event", color: "Blue", rarity: "R", cost: 2 },
  { id: "OP12-062", name: "Counter Shock", set: "The Three Captains", setCode: "OP12", number: "062", type: "Event", color: "Blue", rarity: "R", cost: 1 },
  { id: "OP12-063", name: "Damned Punk", set: "The Three Captains", setCode: "OP12", number: "063", type: "Event", color: "Red", rarity: "R", cost: 2 },
  { id: "OP12-064", name: "Punk Pistols", set: "The Three Captains", setCode: "OP12", number: "064", type: "Event", color: "Red", rarity: "R", cost: 1 },
  { id: "OP12-065", name: "Kamaa Ittoryu", set: "The Three Captains", setCode: "OP12", number: "065", type: "Event", color: "Blue", rarity: "R", cost: 1 },
  
  // Stages
  { id: "OP12-066", name: "Udon Prison", set: "The Three Captains", setCode: "OP12", number: "066", type: "Stage", color: "Purple", rarity: "C", cost: 1 },
  { id: "OP12-067", name: "Kuri", set: "The Three Captains", setCode: "OP12", number: "067", type: "Stage", color: "Red", rarity: "C", cost: 1 },
  { id: "OP12-068", name: "Flower Capital", set: "The Three Captains", setCode: "OP12", number: "068", type: "Stage", color: "Blue", rarity: "C", cost: 1 },
  
  // Secret Rares
  { id: "OP12-069", name: "Monkey D. Luffy", set: "The Three Captains", setCode: "OP12", number: "069", type: "Character", color: "Red", rarity: "SEC", cost: 10, power: 12000 },
  { id: "OP12-070", name: "Trafalgar Law", set: "The Three Captains", setCode: "OP12", number: "070", type: "Character", color: "Blue", rarity: "SEC", cost: 7, power: 9000 },
  { id: "OP12-071", name: "Eustass Kid", set: "The Three Captains", setCode: "OP12", number: "071", type: "Character", color: "Red", rarity: "SEC", cost: 8, power: 10000 },
  { id: "OP12-072", name: "Kaido", set: "The Three Captains", setCode: "OP12", number: "072", type: "Character", color: "Purple", rarity: "SEC", cost: 10, power: 12000 },
];


export default OP12_CARDS;
