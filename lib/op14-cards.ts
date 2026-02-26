// OP14: The Four Emperors - Complete card list
const OP14_CARDS = [
  // Leaders
  { id: "OP14-001", name: "Marshall D. Teach (Blackbeard)", set: "The Four Emperors", setCode: "OP14", number: "001", type: "Leader", color: "Black/Purple", rarity: "L" },
  { id: "OP14-002", name: "Gecko Moria", set: "The Four Emperors", setCode: "OP14", number: "002", type: "Leader", color: "Purple", rarity: "L" },
  { id: "OP14-003", name: "Absalom", set: "The Four Emperors", setCode: "OP14", number: "003", type: "Leader", color: "Purple", rarity: "L" },
  { id: "OP14-004", name: "Perona", set: "The Four Emperors", setCode: "OP14", number: "004", type: "Leader", color: "Purple", rarity: "L" },
  { id: "OP14-005", name: "Oars", set: "The Four Emperors", setCode: "OP14", number: "005", type: "Leader", color: "Purple", rarity: "L" },
  { id: "OP14-006", name: "Doctor Hogback", set: "The Four Emperors", setCode: "OP14", number: "006", type: "Leader", color: "Purple", rarity: "L" },
  
  // Characters SR
  { id: "OP14-007", name: "Marshall D. Teach", set: "The Four Emperors", setCode: "OP14", number: "007", type: "Character", color: "Black", rarity: "SR", cost: 8, power: 10000 },
  { id: "OP14-008", name: "Gecko Moria", set: "The Four Emperors", setCode: "OP14", number: "008", type: "Character", color: "Purple", rarity: "SR", cost: 6, power: 7000 },
  { id: "OP14-009", name: "Absalom", set: "The Four Emperors", setCode: "OP14", number: "009", type: "Character", color: "Purple", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP14-010", name: "Perona", set: "The Four Emperors", setCode: "OP14", number: "010", type: "Character", color: "Purple", rarity: "SR", cost: 3, power: 3000 },
  { id: "OP14-011", name: "Oars", set: "The Four Emperors", setCode: "OP14", number: "011", type: "Character", color: "Purple", rarity: "SR", cost: 7, power: 8000 },
  { id: "OP14-012", name: "Doctor Hogback", set: "The Four Emperors", setCode: "OP14", number: "012", type: "Character", color: "Purple", rarity: "SR", cost: 3, power: 2000 },
  { id: "OP14-013", name: "Kumashi", set: "The Four Emperors", setCode: "OP14", number: "013", type: "Character", color: "Purple", rarity: "SR", cost: 3, power: 3000 },
  { id: "OP14-014", name: "Cindry", set: "The Four Emperors", setCode: "OP14", number: "014", type: "Character", color: "Purple", rarity: "SR", cost: 3, power: 3000 },
  { id: "OP14-015", name: "Jigoro", set: "The Four Emperors", setCode: "OP14", number: "015", type: "Character", color: "Purple", rarity: "SR", cost: 4, power: 4000 },
  { id: "OP14-016", name: "Tararan", set: "The Four Emperors", setCode: "OP14", number: "016", type: "Character", color: "Purple", rarity: "SR", cost: 3, power: 3000 },
  { id: "OP14-017", name: "Inuppe", set: "The Four Emperors", setCode: "OP14", number: "017", type: "Character", color: "Purple", rarity: "SR", cost: 3, power: 3000 },
  { id: "OP14-018", name: "Gyoro", set: "The Four Emperors", setCode: "OP14", number: "018", type: "Character", color: "Purple", rarity: "SR", cost: 2, power: 2000 },
  { id: "OP14-019", name: "Nin", set: "The Four Emperors", setCode: "OP14", number: "019", type: "Character", color: "Purple", rarity: "SR", cost: 2, power: 2000 },
  { id: "OP14-020", name: "Bao", set: "The Four Emperors", setCode: "OP14", number: "020", type: "Character", color: "Purple", rarity: "SR", cost: 2, power: 2000 },
  
  // Characters R
  { id: "OP14-021", name: "Shiryu", set: "The Four Emperors", setCode: "OP14", number: "021", type: "Character", color: "Black", rarity: "R", cost: 4, power: 5000 },
  { id: "OP14-022", name: "Van Augur", set: "The Four Emperors", setCode: "OP14", number: "022", type: "Character", color: "Black", rarity: "R", cost: 3, power: 4000 },
  { id: "OP14-023", name: "Jesus Burgess", set: "The Four Emperors", setCode: "OP14", number: "023", type: "Character", color: "Black", rarity: "R", cost: 4, power: 5000 },
  { id: "OP14-024", name: "Doc Q", set: "The Four Emperors", setCode: "OP14", number: "024", type: "Character", color: "Black", rarity: "R", cost: 2, power: 2000 },
  { id: "OP14-025", name: "Stronger", set: "The Four Emperors", setCode: "OP14", number: "025", type: "Character", color: "Black", rarity: "R", cost: 2, power: 2000 },
  { id: "OP14-026", name: "Laffitte", set: "The Four Emperors", setCode: "OP14", number: "026", type: "Character", color: "Black", rarity: "R", cost: 3, power: 3000 },
  { id: "OP14-027", name: "Avalo Pizarro", set: "The Four Emperors", setCode: "OP14", number: "027", type: "Character", color: "Black", rarity: "R", cost: 3, power: 3000 },
  { id: "OP14-028", name: "Catarina Devon", set: "The Four Emperors", setCode: "OP14", number: "028", type: "Character", color: "Black", rarity: "R", cost: 2, power: 2000 },
  { id: "OP14-029", name: "Sanjuan Wolf", set: "The Four Emperors", setCode: "OP14", number: "029", type: "Character", color: "Black", rarity: "R", cost: 5, power: 5000 },
  { id: "OP14-030", name: "Vasco Shot", set: "The Four Emperors", setCode: "OP14", number: "030", type: "Character", color: "Black", rarity: "R", cost: 3, power: 3000 },
  { id: "OP14-031", name: "Edward Newgate", set: "The Four Emperors", setCode: "OP14", number: "031", type: "Character", color: "Black", rarity: "R", cost: 5, power: 5000 },
  { id: "OP14-032", name: "Portgas D. Ace", set: "The Four Emperors", setCode: "OP14", number: "032", type: "Character", color: "Black", rarity: "R", cost: 4, power: 5000 },
  { id: "OP14-033", name: "Marco", set: "The Four Emperors", setCode: "OP14", number: "033", type: "Character", color: "Black", rarity: "R", cost: 3, power: 4000 },
  { id: "OP14-034", name: "Jozu", set: "The Four Emperors", setCode: "OP14", number: "034", type: "Character", color: "Black", rarity: "R", cost: 4, power: 5000 },
  { id: "OP14-035", name: "Thatch", set: "The Four Emperors", setCode: "OP14", number: "035", type: "Character", color: "Black", rarity: "R", cost: 3, power: 3000 },
  { id: "OP14-036", name: "Vista", set: "The Four Emperors", setCode: "OP14", number: "036", type: "Character", color: "Black", rarity: "R", cost: 3, power: 4000 },
  { id: "OP14-037", name: "Blenheim", set: "The Four Emperors", setCode: "OP14", number: "037", type: "Character", color: "Black", rarity: "R", cost: 4, power: 4000 },
  { id: "OP14-038", name: "Rakuyo", set: "The Four Emperors", setCode: "OP14", number: "038", type: "Character", color: "Black", rarity: "R", cost: 3, power: 3000 },
  { id: "OP14-039", name: "Namur", set: "The Four Emperors", setCode: "OP14", number: "039", type: "Character", color: "Black", rarity: "R", cost: 3, power: 3000 },
  { id: "OP14-040", name: "Curiel", set: "The Four Emperors", setCode: "OP14", number: "040", type: "Character", color: "Black", rarity: "R", cost: 4, power: 4000 },
  
  // Characters UC
  { id: "OP14-041", name: "Kingdew", set: "The Four Emperors", setCode: "OP14", number: "041", type: "Character", color: "Black", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP14-042", name: "Atmos", set: "The Four Emperors", setCode: "OP14", number: "042", type: "Character", color: "Black", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP14-043", name: "Haruta", set: "The Four Emperors", setCode: "OP14", number: "043", type: "Character", color: "Black", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP14-044", name: "Fossa", set: "The Four Emperors", setCode: "OP14", number: "044", type: "Character", color: "Black", rarity: "UC", cost: 4, power: 4000 },
  { id: "OP14-045", name: "Blamenco", set: "The Four Emperors", setCode: "OP14", number: "045", type: "Character", color: "Black", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP14-046", name: "Stefan", set: "The Four Emperors", setCode: "OP14", number: "046", type: "Character", color: "Black", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP14-047", name: "Squard", set: "The Four Emperors", setCode: "OP14", number: "047", type: "Character", color: "Black", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP14-048", name: "Decalvan Brothers", set: "The Four Emperors", setCode: "OP14", number: "048", type: "Character", color: "Black", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP14-049", name: "Whitey Bay", set: "The Four Emperors", setCode: "OP14", number: "049", type: "Character", color: "Black", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP14-050", name: "Little Oars Jr.", set: "The Four Emperors", setCode: "OP14", number: "050", type: "Character", color: "Purple", rarity: "UC", cost: 6, power: 6000 },
  { id: "OP14-051", name: "Izou", set: "The Four Emperors", setCode: "OP14", number: "051", type: "Character", color: "Black", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP14-052", name: "Andre", set: "The Four Emperors", setCode: "OP14", number: "052", type: "Character", color: "Black", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP14-053", name: "Zodia", set: "The Four Emperors", setCode: "OP14", number: "053", type: "Character", color: "Black", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP14-054", name: "Palms", set: "The Four Emperors", setCode: "OP14", number: "054", type: "Character", color: "Black", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP14-055", name: "Karma", set: "The Four Emperors", setCode: "OP14", number: "055", type: "Character", color: "Black", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP14-056", name: "Pavlik", set: "The Four Emperors", setCode: "OP14", number: "056", type: "Character", color: "Black", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP14-057", name: "Islewan", set: "The Four Emperors", setCode: "OP14", number: "057", type: "Character", color: "Black", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP14-058", name: "Rush", set: "The Four Emperors", setCode: "OP14", number: "058", type: "Character", color: "Black", rarity: "UC", cost: 2, power: 2000 },
  
  // Events
  { id: "OP14-059", name: "Black Hole", set: "The Four Emperors", setCode: "OP14", number: "059", type: "Event", color: "Black", rarity: "R", cost: 2 },
  { id: "OP14-060", name: "Dark Water", set: "The Four Emperors", setCode: "OP14", number: "060", type: "Event", color: "Black", rarity: "R", cost: 1 },
  { id: "OP14-061", name: "Liberation", set: "The Four Emperors", setCode: "OP14", number: "061", type: "Event", color: "Black", rarity: "R", cost: 2 },
  { id: "OP14-062", name: "Shadow Asgard", set: "The Four Emperors", setCode: "OP14", number: "062", type: "Event", color: "Purple", rarity: "R", cost: 2 },
  { id: "OP14-063", name: "Brick Bat", set: "The Four Emperors", setCode: "OP14", number: "063", type: "Event", color: "Purple", rarity: "R", cost: 1 },
  { id: "OP14-064", name: "Tropical", set: "The Four Emperors", setCode: "OP14", number: "064", type: "Event", color: "Purple", rarity: "R", cost: 1 },
  { id: "OP14-065", name: "Negative Hollow", set: "The Four Emperors", setCode: "OP14", number: "065", type: "Event", color: "Purple", rarity: "R", cost: 1 },
  
  // Stages
  { id: "OP14-066", name: "Thriller Bark", set: "The Four Emperors", setCode: "OP14", number: "066", type: "Stage", color: "Purple", rarity: "C", cost: 2 },
  { id: "OP14-067", name: "Florian Triangle", set: "The Four Emperors", setCode: "OP14", number: "067", type: "Stage", color: "Purple", rarity: "C", cost: 1 },
  { id: "OP14-068", name: "Mast Mansion", set: "The Four Emperors", setCode: "OP14", number: "068", type: "Stage", color: "Purple", rarity: "C", cost: 1 },
  
  // Secret Rares
  { id: "OP14-069", name: "Marshall D. Teach", set: "The Four Emperors", setCode: "OP14", number: "069", type: "Character", color: "Black", rarity: "SEC", cost: 9, power: 11000 },
  { id: "OP14-070", name: "Gecko Moria", set: "The Four Emperors", setCode: "OP14", number: "070", type: "Character", color: "Purple", rarity: "SEC", cost: 7, power: 9000 },
  { id: "OP14-071", name: "Oars", set: "The Four Emperors", setCode: "OP14", number: "071", type: "Character", color: "Purple", rarity: "SEC", cost: 8, power: 10000 },
  { id: "OP14-072", name: "Edward Newgate", set: "The Four Emperors", setCode: "OP14", number: "072", type: "Character", color: "Black", rarity: "SEC", cost: 9, power: 10000 },
];


export default OP14_CARDS;
