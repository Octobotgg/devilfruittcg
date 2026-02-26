// OP11: A Fist of Divine Speed - Complete card list
const OP11_CARDS = [
  // Leaders
  { id: "OP11-001", name: "Borsalino (Kizaru)", set: "A Fist of Divine Speed", setCode: "OP11", number: "001", type: "Leader", color: "Yellow", rarity: "L" },
  { id: "OP11-002", name: "Sentomaru", set: "A Fist of Divine Speed", setCode: "OP11", number: "002", type: "Leader", color: "Yellow", rarity: "L" },
  { id: "OP11-003", name: "Vegapunk", set: "A Fist of Divine Speed", setCode: "OP11", number: "003", type: "Leader", color: "Yellow", rarity: "L" },
  { id: "OP11-004", name: "Kuzan (Aokiji)", set: "A Fist of Divine Speed", setCode: "OP11", number: "004", type: "Leader", color: "Blue", rarity: "L" },
  { id: "OP11-005", name: "Rob Lucci", set: "A Fist of Divine Speed", setCode: "OP11", number: "005", type: "Leader", color: "Black", rarity: "L" },
  { id: "OP11-006", name: "Jaygarcia Saturn", set: "A Fist of Divine Speed", setCode: "OP11", number: "006", type: "Leader", color: "Black", rarity: "L" },
  
  // Characters SR
  { id: "OP11-007", name: "Borsalino", set: "A Fist of Divine Speed", setCode: "OP11", number: "007", type: "Character", color: "Yellow", rarity: "SR", cost: 7, power: 9000 },
  { id: "OP11-008", name: "Sentomaru", set: "A Fist of Divine Speed", setCode: "OP11", number: "008", type: "Character", color: "Yellow", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP11-009", name: "Vegapunk", set: "A Fist of Divine Speed", setCode: "OP11", number: "009", type: "Character", color: "Yellow", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP11-010", name: "Kuzan", set: "A Fist of Divine Speed", setCode: "OP11", number: "010", type: "Character", color: "Blue", rarity: "SR", cost: 6, power: 7000 },
  { id: "OP11-011", name: "Rob Lucci", set: "A Fist of Divine Speed", setCode: "OP11", number: "011", type: "Character", color: "Black", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP11-012", name: "Jaygarcia Saturn", set: "A Fist of Divine Speed", setCode: "OP11", number: "012", type: "Character", color: "Black", rarity: "SR", cost: 7, power: 9000 },
  { id: "OP11-013", name: "Kaku", set: "A Fist of Divine Speed", setCode: "OP11", number: "013", type: "Character", color: "Black", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP11-014", name: "Stussy", set: "A Fist of Divine Speed", setCode: "OP11", number: "014", type: "Character", color: "Black", rarity: "SR", cost: 3, power: 4000 },
  { id: "OP11-015", name: "Jabra", set: "A Fist of Divine Speed", setCode: "OP11", number: "015", type: "Character", color: "Black", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP11-016", name: "Blueno", set: "A Fist of Divine Speed", setCode: "OP11", number: "016", type: "Character", color: "Black", rarity: "SR", cost: 3, power: 4000 },
  { id: "OP11-017", name: "Kumadori", set: "A Fist of Divine Speed", setCode: "OP11", number: "017", type: "Character", color: "Black", rarity: "SR", cost: 3, power: 3000 },
  { id: "OP11-018", name: "Fukurou", set: "A Fist of Divine Speed", setCode: "OP11", number: "018", type: "Character", color: "Black", rarity: "SR", cost: 3, power: 3000 },
  { id: "OP11-019", name: "Kalifa", set: "A Fist of Divine Speed", setCode: "OP11", number: "019", type: "Character", color: "Black", rarity: "SR", cost: 2, power: 3000 },
  { id: "OP11-020", name: "Spandam", set: "A Fist of Divine Speed", setCode: "OP11", number: "020", type: "Character", color: "Black", rarity: "SR", cost: 3, power: 2000 },
  
  // Characters R
  { id: "OP11-021", name: "Pacifista Mark III", set: "A Fist of Divine Speed", setCode: "OP11", number: "021", type: "Character", color: "Yellow", rarity: "R", cost: 5, power: 6000 },
  { id: "OP11-022", name: "Pacifista Mark II", set: "A Fist of Divine Speed", setCode: "OP11", number: "022", type: "Character", color: "Yellow", rarity: "R", cost: 5, power: 5000 },
  { id: "OP11-023", name: "Seraphim S-Hawk", set: "A Fist of Divine Speed", setCode: "OP11", number: "023", type: "Character", color: "Yellow", rarity: "R", cost: 4, power: 5000 },
  { id: "OP11-024", name: "Seraphim S-Shark", set: "A Fist of Divine Speed", setCode: "OP11", number: "024", type: "Character", color: "Yellow", rarity: "R", cost: 4, power: 5000 },
  { id: "OP11-025", name: "Seraphim S-Bear", set: "A Fist of Divine Speed", setCode: "OP11", number: "025", type: "Character", color: "Yellow", rarity: "R", cost: 4, power: 5000 },
  { id: "OP11-026", name: "Seraphim S-Snake", set: "A Fist of Divine Speed", setCode: "OP11", number: "026", type: "Character", color: "Yellow", rarity: "R", cost: 4, power: 4000 },
  { id: "OP11-027", name: "Lilith", set: "A Fist of Divine Speed", setCode: "OP11", number: "027", type: "Character", color: "Yellow", rarity: "R", cost: 2, power: 2000 },
  { id: "OP11-028", name: "Atlas", set: "A Fist of Divine Speed", setCode: "OP11", number: "028", type: "Character", color: "Yellow", rarity: "R", cost: 3, power: 3000 },
  { id: "OP11-029", name: "Edison", set: "A Fist of Divine Speed", setCode: "OP11", number: "029", type: "Character", color: "Yellow", rarity: "R", cost: 2, power: 2000 },
  { id: "OP11-030", name: "Pythagoras", set: "A Fist of Divine Speed", setCode: "OP11", number: "030", type: "Character", color: "Yellow", rarity: "R", cost: 2, power: 2000 },
  { id: "OP11-031", name: "York", set: "A Fist of Divine Speed", setCode: "OP11", number: "031", type: "Character", color: "Yellow", rarity: "R", cost: 1, power: 1000 },
  { id: "OP11-032", name: "Shaka", set: "A Fist of Divine Speed", setCode: "OP11", number: "032", type: "Character", color: "Yellow", rarity: "R", cost: 3, power: 3000 },
  { id: "OP11-033", name: "Hattori", set: "A Fist of Divine Speed", setCode: "OP11", number: "033", type: "Character", color: "Black", rarity: "R", cost: 1, power: 1000 },
  { id: "OP11-034", name: "Hattori's Master", set: "A Fist of Divine Speed", setCode: "OP11", number: "034", type: "Character", color: "Black", rarity: "R", cost: 2, power: 2000 },
  { id: "OP11-035", name: "Hattori's Mentor", set: "A Fist of Divine Speed", setCode: "OP11", number: "035", type: "Character", color: "Black", rarity: "R", cost: 3, power: 3000 },
  { id: "OP11-036", name: "Hattori's Comrade", set: "A Fist of Divine Speed", setCode: "OP11", number: "036", type: "Character", color: "Black", rarity: "R", cost: 4, power: 4000 },
  { id: "OP11-037", name: "Hattori's Ally", set: "A Fist of Divine Speed", setCode: "OP11", number: "037", type: "Character", color: "Black", rarity: "R", cost: 5, power: 5000 },
  { id: "OP11-038", name: "Hattori's Friend", set: "A Fist of Divine Speed", setCode: "OP11", number: "038", type: "Character", color: "Black", rarity: "R", cost: 6, power: 6000 },
  { id: "OP11-039", name: "Hattori's Pal", set: "A Fist of Divine Speed", setCode: "OP11", number: "039", type: "Character", color: "Black", rarity: "R", cost: 7, power: 7000 },
  { id: "OP11-040", name: "Hattori's Buddy", set: "A Fist of Divine Speed", setCode: "OP11", number: "040", type: "Character", color: "Black", rarity: "R", cost: 8, power: 8000 },
  
  // Characters UC
  { id: "OP11-041", name: "Hibari", set: "A Fist of Divine Speed", setCode: "OP11", number: "041", type: "Character", color: "Yellow", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP11-042", name: "Helmeppo", set: "A Fist of Divine Speed", setCode: "OP11", number: "042", type: "Character", color: "Yellow", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP11-043", name: "Tashigi", set: "A Fist of Divine Speed", setCode: "OP11", number: "043", type: "Character", color: "Yellow", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP11-044", name: "Smoker", set: "A Fist of Divine Speed", setCode: "OP11", number: "044", type: "Character", color: "Yellow", rarity: "UC", cost: 4, power: 5000 },
  { id: "OP11-045", name: "Hina", set: "A Fist of Divine Speed", setCode: "OP11", number: "045", type: "Character", color: "Yellow", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP11-046", name: "Fullbody", set: "A Fist of Divine Speed", setCode: "OP11", number: "046", type: "Character", color: "Yellow", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP11-047", name: "Jango", set: "A Fist of Divine Speed", setCode: "OP11", number: "047", type: "Character", color: "Yellow", rarity: "UC", cost: 1, power: 1000 },
  { id: "OP11-048", name: "Coby", set: "A Fist of Divine Speed", setCode: "OP11", number: "048", type: "Character", color: "Yellow", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP11-049", name: "Garp", set: "A Fist of Divine Speed", setCode: "OP11", number: "049", type: "Character", color: "Yellow", rarity: "UC", cost: 5, power: 6000 },
  { id: "OP11-050", name: "Tsuru", set: "A Fist of Divine Speed", setCode: "OP11", number: "050", type: "Character", color: "Yellow", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP11-051", name: "Doberman", set: "A Fist of Divine Speed", setCode: "OP11", number: "051", type: "Character", color: "Yellow", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP11-052", name: "Onigumo", set: "A Fist of Divine Speed", setCode: "OP11", number: "052", type: "Character", color: "Yellow", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP11-053", name: "Momonga", set: "A Fist of Divine Speed", setCode: "OP11", number: "053", type: "Character", color: "Yellow", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP11-054", name: "Strawberry", set: "A Fist of Divine Speed", setCode: "OP11", number: "054", type: "Character", color: "Yellow", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP11-055", name: "Yamakaji", set: "A Fist of Divine Speed", setCode: "OP11", number: "055", type: "Character", color: "Yellow", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP11-056", name: "Lacroix", set: "A Fist of Divine Speed", setCode: "OP11", number: "056", type: "Character", color: "Yellow", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP11-057", name: "Lonz", set: "A Fist of Divine Speed", setCode: "OP11", number: "057", type: "Character", color: "Yellow", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP11-058", name: "Dalmatian", set: "A Fist of Divine Speed", setCode: "OP11", number: "058", type: "Character", color: "Yellow", rarity: "UC", cost: 4, power: 5000 },
  
  // Events
  { id: "OP11-059", name: "Yasakani Sacred Jewel", set: "A Fist of Divine Speed", setCode: "OP11", number: "059", type: "Event", color: "Yellow", rarity: "R", cost: 2 },
  { id: "OP11-060", name: "Amaterasu", set: "A Fist of Divine Speed", setCode: "OP11", number: "060", type: "Event", color: "Yellow", rarity: "R", cost: 1 },
  { id: "OP11-061", name: "Ama no Murakumo", set: "A Fist of Divine Speed", setCode: "OP11", number: "061", type: "Event", color: "Yellow", rarity: "R", cost: 1 },
  { id: "OP11-062", name: "Tempest Kick", set: "A Fist of Divine Speed", setCode: "OP11", number: "062", type: "Event", color: "Black", rarity: "R", cost: 1 },
  { id: "OP11-063", name: "Iron Mass", set: "A Fist of Divine Speed", setCode: "OP11", number: "063", type: "Event", color: "Black", rarity: "R", cost: 1 },
  { id: "OP11-064", name: "Finger Pistol", set: "A Fist of Divine Speed", setCode: "OP11", number: "064", type: "Event", color: "Black", rarity: "R", cost: 1 },
  { id: "OP11-065", name: "Paper Art", set: "A Fist of Divine Speed", setCode: "OP11", number: "065", type: "Event", color: "Black", rarity: "R", cost: 1 },
  
  // Stages
  { id: "OP11-066", name: "Egghead Island", set: "A Fist of Divine Speed", setCode: "OP11", number: "066", type: "Stage", color: "Yellow", rarity: "C", cost: 2 },
  { id: "OP11-067", name: "Laboratory Phase", set: "A Fist of Divine Speed", setCode: "OP11", number: "067", type: "Stage", color: "Yellow", rarity: "C", cost: 1 },
  { id: "OP11-068", name: "Fabiriophase", set: "A Fist of Divine Speed", setCode: "OP11", number: "068", type: "Stage", color: "Black", rarity: "C", cost: 1 },
  
  // Secret Rares
  { id: "OP11-069", name: "Borsalino", set: "A Fist of Divine Speed", setCode: "OP11", number: "069", type: "Character", color: "Yellow", rarity: "SEC", cost: 8, power: 10000 },
  { id: "OP11-070", name: "Vegapunk", set: "A Fist of Divine Speed", setCode: "OP11", number: "070", type: "Character", color: "Yellow", rarity: "SEC", cost: 6, power: 7000 },
  { id: "OP11-071", name: "Rob Lucci", set: "A Fist of Divine Speed", setCode: "OP11", number: "071", type: "Character", color: "Black", rarity: "SEC", cost: 6, power: 7000 },
  { id: "OP11-072", name: "Jaygarcia Saturn", set: "A Fist of Divine Speed", setCode: "OP11", number: "072", type: "Character", color: "Black", rarity: "SEC", cost: 8, power: 10000 },
];


export default OP11_CARDS;
