export interface Card {
  id: string;
  name: string;
  set: string;
  setCode: string;
  number: string;
  type: string;
  color: string;
  rarity: string;
  cost?: number;
  power?: number;
  attribute?: string;
  imageUrl?: string;
}

export const SEED_CARDS: Card[] = [
  // OP01 - Romance Dawn
  { id: "OP01-001", name: "Monkey D. Luffy", set: "Romance Dawn", setCode: "OP01", number: "001", type: "Leader", color: "Red", rarity: "L" },
  { id: "OP01-002", name: "Roronoa Zoro", set: "Romance Dawn", setCode: "OP01", number: "002", type: "Character", color: "Green", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP01-003", name: "Nami", set: "Romance Dawn", setCode: "OP01", number: "003", type: "Character", color: "Green", rarity: "R", cost: 2, power: 2000 },
  { id: "OP01-004", name: "Usopp", set: "Romance Dawn", setCode: "OP01", number: "004", type: "Character", color: "Green", rarity: "UC", cost: 2, power: 1000 },
  { id: "OP01-005", name: "Sanji", set: "Romance Dawn", setCode: "OP01", number: "005", type: "Character", color: "Red", rarity: "SR", cost: 4, power: 6000 },
  { id: "OP01-006", name: "Tony Tony Chopper", set: "Romance Dawn", setCode: "OP01", number: "006", type: "Character", color: "Green", rarity: "R", cost: 1, power: 1000 },
  { id: "OP01-007", name: "Nico Robin", set: "Romance Dawn", setCode: "OP01", number: "007", type: "Character", color: "Purple", rarity: "R", cost: 3, power: 3000 },
  { id: "OP01-008", name: "Franky", set: "Romance Dawn", setCode: "OP01", number: "008", type: "Character", color: "Blue", rarity: "R", cost: 4, power: 5000 },
  { id: "OP01-009", name: "Brook", set: "Romance Dawn", setCode: "OP01", number: "009", type: "Character", color: "Black", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP01-010", name: "Jinbe", set: "Romance Dawn", setCode: "OP01", number: "010", type: "Character", color: "Blue", rarity: "SR", cost: 5, power: 7000 },
  { id: "OP01-011", name: "Shanks", set: "Romance Dawn", setCode: "OP01", number: "011", type: "Character", color: "Red", rarity: "SR", cost: 9, power: 10000 },
  { id: "OP01-012", name: "Trafalgar Law", set: "Romance Dawn", setCode: "OP01", number: "012", type: "Character", color: "Blue", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP01-013", name: "Portgas D. Ace", set: "Romance Dawn", setCode: "OP01", number: "013", type: "Character", color: "Red", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP01-014", name: "Whitebeard", set: "Romance Dawn", setCode: "OP01", number: "014", type: "Character", color: "Black", rarity: "SR", cost: 8, power: 10000 },
  { id: "OP01-015", name: "Crocodile", set: "Romance Dawn", setCode: "OP01", number: "015", type: "Character", color: "Purple", rarity: "R", cost: 4, power: 5000 },
  { id: "OP01-016", name: "Dracule Mihawk", set: "Romance Dawn", setCode: "OP01", number: "016", type: "Character", color: "Green", rarity: "SR", cost: 7, power: 9000 },
  { id: "OP01-017", name: "Boa Hancock", set: "Romance Dawn", setCode: "OP01", number: "017", type: "Character", color: "Black", rarity: "SR", cost: 6, power: 7000 },

  // OP02 - Paramount War (Complete 121-card set)
  // Leaders
  { id: "OP02-001", name: "Trafalgar Law", set: "Paramount War", setCode: "OP02", number: "001", type: "Leader", color: "Blue", rarity: "L" },
  { id: "OP02-002", name: "Edward Newgate (Whitebeard)", set: "Paramount War", setCode: "OP02", number: "002", type: "Leader", color: "Black", rarity: "L" },
  { id: "OP02-003", name: "Portgas D. Ace", set: "Paramount War", setCode: "OP02", number: "003", type: "Leader", color: "Red", rarity: "L" },
  { id: "OP02-004", name: "Marco", set: "Paramount War", setCode: "OP02", number: "004", type: "Leader", color: "Purple", rarity: "L" },
  { id: "OP02-005", name: "Monkey D. Garp", set: "Paramount War", setCode: "OP02", number: "005", type: "Leader", color: "Blue", rarity: "L" },
  { id: "OP02-006", name: "Sengoku", set: "Paramount War", setCode: "OP02", number: "006", type: "Leader", color: "Yellow", rarity: "L" },
  { id: "OP02-007", name: "Aokiji", set: "Paramount War", setCode: "OP02", number: "007", type: "Leader", color: "Blue", rarity: "L" },
  { id: "OP02-008", name: "Kizaru", set: "Paramount War", setCode: "OP02", number: "008", type: "Leader", color: "Yellow", rarity: "L" },
  { id: "OP02-009", name: "Akainu", set: "Paramount War", setCode: "OP02", number: "009", type: "Leader", color: "Black", rarity: "L" },
  // Characters SR
  { id: "OP02-010", name: "Portgas D. Ace", set: "Paramount War", setCode: "OP02", number: "010", type: "Character", color: "Red", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP02-011", name: "Marco", set: "Paramount War", setCode: "OP02", number: "011", type: "Character", color: "Purple", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP02-012", name: "Jozu", set: "Paramount War", setCode: "OP02", number: "012", type: "Character", color: "Purple", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP02-013", name: "Thatch", set: "Paramount War", setCode: "OP02", number: "013", type: "Character", color: "Purple", rarity: "SR", cost: 3, power: 4000 },
  { id: "OP02-014", name: "Vista", set: "Paramount War", setCode: "OP02", number: "014", type: "Character", color: "Black", rarity: "SR", cost: 3, power: 4000 },
  { id: "OP02-015", name: "Whitebeard", set: "Paramount War", setCode: "OP02", number: "015", type: "Character", color: "Black", rarity: "SR", cost: 9, power: 10000 },
  { id: "OP02-016", name: "Monkey D. Garp", set: "Paramount War", setCode: "OP02", number: "016", type: "Character", color: "Blue", rarity: "SR", cost: 6, power: 7000 },
  { id: "OP02-017", name: "Sengoku", set: "Paramount War", setCode: "OP02", number: "017", type: "Character", color: "Yellow", rarity: "SR", cost: 7, power: 8000 },
  { id: "OP02-018", name: "Aokiji", set: "Paramount War", setCode: "OP02", number: "018", type: "Character", color: "Blue", rarity: "SR", cost: 6, power: 7000 },
  { id: "OP02-019", name: "Kizaru", set: "Paramount War", setCode: "OP02", number: "019", type: "Character", color: "Yellow", rarity: "SR", cost: 6, power: 7000 },
  { id: "OP02-020", name: "Akainu", set: "Paramount War", setCode: "OP02", number: "020", type: "Character", color: "Black", rarity: "SR", cost: 7, power: 9000 },
  // Characters R
  { id: "OP02-021", name: "Jinbe", set: "Paramount War", setCode: "OP02", number: "021", type: "Character", color: "Red", rarity: "R", cost: 4, power: 5000 },
  { id: "OP02-022", name: "Mr. 3", set: "Paramount War", setCode: "OP02", number: "022", type: "Character", color: "Red", rarity: "R", cost: 2, power: 3000 },
  { id: "OP02-023", name: "Blenheim", set: "Paramount War", setCode: "OP02", number: "023", type: "Character", color: "Purple", rarity: "R", cost: 4, power: 5000 },
  { id: "OP02-024", name: "Rakuyo", set: "Paramount War", setCode: "OP02", number: "024", type: "Character", color: "Purple", rarity: "R", cost: 3, power: 4000 },
  { id: "OP02-025", name: "Namur", set: "Paramount War", setCode: "OP02", number: "025", type: "Character", color: "Purple", rarity: "R", cost: 3, power: 3000 },
  { id: "OP02-026", name: "Curiel", set: "Paramount War", setCode: "OP02", number: "026", type: "Character", color: "Black", rarity: "R", cost: 4, power: 5000 },
  { id: "OP02-027", name: "Kingdew", set: "Paramount War", setCode: "OP02", number: "027", type: "Character", color: "Black", rarity: "R", cost: 3, power: 4000 },
  { id: "OP02-028", name: "Atmos", set: "Paramount War", setCode: "OP02", number: "028", type: "Character", color: "Black", rarity: "R", cost: 4, power: 4000 },
  { id: "OP02-029", name: "Haruta", set: "Paramount War", setCode: "OP02", number: "029", type: "Character", color: "Purple", rarity: "R", cost: 2, power: 3000 },
  { id: "OP02-030", name: "Fossa", set: "Paramount War", setCode: "OP02", number: "030", type: "Character", color: "Black", rarity: "R", cost: 4, power: 5000 },
  { id: "OP02-031", name: "Blamenco", set: "Paramount War", setCode: "OP02", number: "031", type: "Character", color: "Black", rarity: "R", cost: 3, power: 4000 },
  { id: "OP02-032", name: "Smoker", set: "Paramount War", setCode: "OP02", number: "032", type: "Character", color: "Blue", rarity: "R", cost: 4, power: 5000 },
  { id: "OP02-033", name: "Tashigi", set: "Paramount War", setCode: "OP02", number: "033", type: "Character", color: "Blue", rarity: "R", cost: 2, power: 3000 },
  { id: "OP02-034", name: "Coby", set: "Paramount War", setCode: "OP02", number: "034", type: "Character", color: "Blue", rarity: "R", cost: 1, power: 2000 },
  { id: "OP02-035", name: "Tsuru", set: "Paramount War", setCode: "OP02", number: "035", type: "Character", color: "Yellow", rarity: "R", cost: 3, power: 4000 },
  { id: "OP02-036", name: "Momonga", set: "Paramount War", setCode: "OP02", number: "036", type: "Character", color: "Blue", rarity: "R", cost: 3, power: 4000 },
  { id: "OP02-037", name: "Onigumo", set: "Paramount War", setCode: "OP02", number: "037", type: "Character", color: "Blue", rarity: "R", cost: 3, power: 3000 },
  { id: "OP02-038", name: "Doberman", set: "Paramount War", setCode: "OP02", number: "038", type: "Character", color: "Blue", rarity: "R", cost: 3, power: 4000 },
  { id: "OP02-039", name: "Hina", set: "Paramount War", setCode: "OP02", number: "039", type: "Character", color: "Blue", rarity: "R", cost: 2, power: 3000 },
  { id: "OP02-040", name: "Sentomaru", set: "Paramount War", setCode: "OP02", number: "040", type: "Character", color: "Yellow", rarity: "R", cost: 3, power: 4000 },
  // Characters UC
  { id: "OP02-041", name: "Buggy", set: "Paramount War", setCode: "OP02", number: "041", type: "Character", color: "Red", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP02-042", name: "Lvneel Kingdom", set: "Paramount War", setCode: "OP02", number: "042", type: "Character", color: "Red", rarity: "UC", cost: 1, power: 0 },
  { id: "OP02-043", name: "Crocus", set: "Paramount War", setCode: "OP02", number: "043", type: "Character", color: "Red", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP02-044", name: "Stefan", set: "Paramount War", setCode: "OP02", number: "044", type: "Character", color: "Purple", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP02-045", name: "Squard", set: "Paramount War", setCode: "OP02", number: "045", type: "Character", color: "Purple", rarity: "UC", cost: 2, power: 3000 },
  { id: "OP02-046", name: "Decalvan Brothers", set: "Paramount War", setCode: "OP02", number: "046", type: "Character", color: "Purple", rarity: "UC", cost: 2, power: 3000 },
  { id: "OP02-047", name: "Whitebeard Pirates", set: "Paramount War", setCode: "OP02", number: "047", type: "Character", color: "Black", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP02-048", name: "Izou", set: "Paramount War", setCode: "OP02", number: "048", type: "Character", color: "Black", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP02-049", name: "Speed Jiru", set: "Paramount War", setCode: "OP02", number: "049", type: "Character", color: "Black", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP02-050", name: "Whitey Bay", set: "Paramount War", setCode: "OP02", number: "050", type: "Character", color: "Purple", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP02-051", name: "Little Oars Jr.", set: "Paramount War", setCode: "OP02", number: "051", type: "Character", color: "Purple", rarity: "UC", cost: 7, power: 7000 },
  { id: "OP02-052", name: "Marco (Human)", set: "Paramount War", setCode: "OP02", number: "052", type: "Character", color: "Purple", rarity: "UC", cost: 4, power: 4000 },
  { id: "OP02-053", name: "Andre", set: "Paramount War", setCode: "OP02", number: "053", type: "Character", color: "Black", rarity: "UC", cost: 2, power: 3000 },
  { id: "OP02-054", name: "Lacuba", set: "Paramount War", setCode: "OP02", number: "054", type: "Character", color: "Blue", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP02-055", name: "Pepper", set: "Paramount War", setCode: "OP02", number: "055", type: "Character", color: "Blue", rarity: "UC", cost: 1, power: 1000 },
  { id: "OP02-056", name: "Gin", set: "Paramount War", setCode: "OP02", number: "056", type: "Character", color: "Blue", rarity: "UC", cost: 2, power: 3000 },
  { id: "OP02-057", name: "Jango", set: "Paramount War", setCode: "OP02", number: "057", type: "Character", color: "Blue", rarity: "UC", cost: 1, power: 2000 },
  { id: "OP02-058", name: "Fullbody", set: "Paramount War", setCode: "OP02", number: "058", type: "Character", color: "Blue", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP02-059", name: "Pacifista", set: "Paramount War", setCode: "OP02", number: "059", type: "Character", color: "Yellow", rarity: "UC", cost: 5, power: 5000 },
  { id: "OP02-060", name: "Capone Gang Bege", set: "Paramount War", setCode: "OP02", number: "060", type: "Character", color: "Blue", rarity: "UC", cost: 3, power: 3000 },
  // Characters C
  { id: "OP02-061", name: "Wapol", set: "Paramount War", setCode: "OP02", number: "061", type: "Character", color: "Red", rarity: "C", cost: 3, power: 3000 },
  { id: "OP02-062", name: "Dalton", set: "Paramount War", setCode: "OP02", number: "062", type: "Character", color: "Red", rarity: "C", cost: 2, power: 2000 },
  { id: "OP02-063", name: "Chess", set: "Paramount War", setCode: "OP02", number: "063", type: "Character", color: "Red", rarity: "C", cost: 2, power: 2000 },
  { id: "OP02-064", name: "Kuromarimo", set: "Paramount War", setCode: "OP02", number: "064", type: "Character", color: "Red", rarity: "C", cost: 2, power: 2000 },
  { id: "OP02-065", name: "Dr. Kureha", set: "Paramount War", setCode: "OP02", number: "065", type: "Character", color: "Red", rarity: "C", cost: 1, power: 0 },
  { id: "OP02-066", name: "Matsuge", set: "Paramount War", setCode: "OP02", number: "066", type: "Character", color: "Red", rarity: "C", cost: 1, power: 1000 },
  { id: "OP02-067", name: "Avalo Pizarro", set: "Paramount War", setCode: "OP02", number: "067", type: "Character", color: "Purple", rarity: "C", cost: 3, power: 3000 },
  { id: "OP02-068", name: "Catarina Devon", set: "Paramount War", setCode: "OP02", number: "068", type: "Character", color: "Purple", rarity: "C", cost: 2, power: 2000 },
  { id: "OP02-069", name: "Sanjuan Wolf", set: "Paramount War", setCode: "OP02", number: "069", type: "Character", color: "Purple", rarity: "C", cost: 5, power: 5000 },
  { id: "OP02-070", name: "Vasco Shot", set: "Paramount War", setCode: "OP02", number: "070", type: "Character", color: "Purple", rarity: "C", cost: 3, power: 3000 },
  { id: "OP02-071", name: "Edward Newgate", set: "Paramount War", setCode: "OP02", number: "071", type: "Character", color: "Black", rarity: "C", cost: 5, power: 5000 },
  { id: "OP02-072", name: "Laffitte", set: "Paramount War", setCode: "OP02", number: "072", type: "Character", color: "Black", rarity: "C", cost: 3, power: 3000 },
  { id: "OP02-073", name: "Shiryu", set: "Paramount War", setCode: "OP02", number: "073", type: "Character", color: "Black", rarity: "C", cost: 4, power: 4000 },
  { id: "OP02-074", name: "Blackbeard Pirates", set: "Paramount War", setCode: "OP02", number: "074", type: "Character", color: "Black", rarity: "C", cost: 2, power: 2000 },
  { id: "OP02-075", name: "Van Augur", set: "Paramount War", setCode: "OP02", number: "075", type: "Character", color: "Black", rarity: "C", cost: 3, power: 3000 },
  { id: "OP02-076", name: "Jesus Burgess", set: "Paramount War", setCode: "OP02", number: "076", type: "Character", color: "Black", rarity: "C", cost: 4, power: 4000 },
  { id: "OP02-077", name: "Doc Q", set: "Paramount War", setCode: "OP02", number: "077", type: "Character", color: "Black", rarity: "C", cost: 2, power: 2000 },
  { id: "OP02-078", name: "Stronger", set: "Paramount War", setCode: "OP02", number: "078", type: "Character", color: "Black", rarity: "C", cost: 2, power: 2000 },
  { id: "OP02-079", name: "Makino", set: "Paramount War", setCode: "OP02", number: "079", type: "Character", color: "Blue", rarity: "C", cost: 1, power: 0 },
  { id: "OP02-080", name: "Woop Slap", set: "Paramount War", setCode: "OP02", number: "080", type: "Character", color: "Blue", rarity: "C", cost: 1, power: 1000 },
  // Characters C (continued)
  { id: "OP02-081", name: "Sabo", set: "Paramount War", setCode: "OP02", number: "081", type: "Character", color: "Blue", rarity: "C", cost: 3, power: 3000 },
  { id: "OP02-082", name: "Koala", set: "Paramount War", setCode: "OP02", number: "082", type: "Character", color: "Blue", rarity: "C", cost: 2, power: 2000 },
  { id: "OP02-083", name: "Hack", set: "Paramount War", setCode: "OP02", number: "083", type: "Character", color: "Blue", rarity: "C", cost: 3, power: 3000 },
  { id: "OP02-084", name: "Emporio Ivankov", set: "Paramount War", setCode: "OP02", number: "084", type: "Character", color: "Blue", rarity: "C", cost: 4, power: 4000 },
  { id: "OP02-085", name: "Inazuma", set: "Paramount War", setCode: "OP02", number: "085", type: "Character", color: "Blue", rarity: "C", cost: 3, power: 3000 },
  { id: "OP02-086", name: "Karasu", set: "Paramount War", setCode: "OP02", number: "086", type: "Character", color: "Blue", rarity: "C", cost: 2, power: 2000 },
  { id: "OP02-087", name: "Morley", set: "Paramount War", setCode: "OP02", number: "087", type: "Character", color: "Blue", rarity: "C", cost: 5, power: 5000 },
  { id: "OP02-088", name: "Belo Betty", set: "Paramount War", setCode: "OP02", number: "088", type: "Character", color: "Blue", rarity: "C", cost: 2, power: 2000 },
  { id: "OP02-089", name: "Lindbergh", set: "Paramount War", setCode: "OP02", number: "089", type: "Character", color: "Blue", rarity: "C", cost: 3, power: 3000 },
  { id: "OP02-090", name: "Moda", set: "Paramount War", setCode: "OP02", number: "090", type: "Character", color: "Blue", rarity: "C", cost: 1, power: 0 },
  // Characters C (final)
  { id: "OP02-091", name: "Sengoku", set: "Paramount War", setCode: "OP02", number: "091", type: "Character", color: "Yellow", rarity: "C", cost: 5, power: 5000 },
  { id: "OP02-092", name: "Hody Jones", set: "Paramount War", setCode: "OP02", number: "092", type: "Character", color: "Blue", rarity: "C", cost: 3, power: 3000 },
  { id: "OP02-093", name: "Zeo", set: "Paramount War", setCode: "OP02", number: "093", type: "Character", color: "Blue", rarity: "C", cost: 2, power: 2000 },
  { id: "OP02-094", name: "Dosun", set: "Paramount War", setCode: "OP02", number: "094", type: "Character", color: "Blue", rarity: "C", cost: 3, power: 3000 },
  { id: "OP02-095", name: "Daruma", set: "Paramount War", setCode: "OP02", number: "095", type: "Character", color: "Blue", rarity: "C", cost: 2, power: 2000 },
  { id: "OP02-096", name: "Ikaros Much", set: "Paramount War", setCode: "OP02", number: "096", type: "Character", color: "Blue", rarity: "C", cost: 2, power: 2000 },
  { id: "OP02-097", name: "Hyouzou", set: "Paramount War", setCode: "OP02", number: "097", type: "Character", color: "Blue", rarity: "C", cost: 3, power: 3000 },
  // Events
  { id: "OP02-098", name: "Gum-Gum Red Hawk", set: "Paramount War", setCode: "OP02", number: "098", type: "Event", color: "Red", rarity: "R", cost: 2 },
  { id: "OP02-099", name: "Paradise Waterfall", set: "Paramount War", setCode: "OP02", number: "099", type: "Event", color: "Red", rarity: "C", cost: 1 },
  { id: "OP02-100", name: "Great Eruption", set: "Paramount War", setCode: "OP02", number: "100", type: "Event", color: "Black", rarity: "R", cost: 2 },
  { id: "OP02-101", name: "Meteor Volcano", set: "Paramount War", setCode: "OP02", number: "101", type: "Event", color: "Black", rarity: "C", cost: 3 },
  { id: "OP02-102", name: "Ice Age", set: "Paramount War", setCode: "OP02", number: "102", type: "Event", color: "Blue", rarity: "R", cost: 2 },
  { id: "OP02-103", name: "Ice Block: Partisan", set: "Paramount War", setCode: "OP02", number: "103", type: "Event", color: "Blue", rarity: "C", cost: 3 },
  { id: "OP02-104", name: "Sky Walk", set: "Paramount War", setCode: "OP02", number: "104", type: "Event", color: "Blue", rarity: "C", cost: 1 },
  { id: "OP02-105", name: "Judgment of Hell", set: "Paramount War", setCode: "OP02", number: "105", type: "Event", color: "Blue", rarity: "C", cost: 2 },
  { id: "OP02-106", name: "108 Pound Phoenix", set: "Paramount War", setCode: "OP02", number: "106", type: "Event", color: "Blue", rarity: "C", cost: 3 },
  { id: "OP02-107", name: "Buddha's Palm", set: "Paramount War", setCode: "OP02", number: "107", type: "Event", color: "Yellow", rarity: "R", cost: 2 },
  { id: "OP02-108", name: "Shave", set: "Paramount War", setCode: "OP02", number: "108", type: "Event", color: "Yellow", rarity: "C", cost: 2 },
  { id: "OP02-109", name: "Radiant Sacrifice", set: "Paramount War", setCode: "OP02", number: "109", type: "Event", color: "Yellow", rarity: "C", cost: 1 },
  { id: "OP02-110", name: "Overheat", set: "Paramount War", setCode: "OP02", number: "110", type: "Event", color: "Yellow", rarity: "C", cost: 3 },
  { id: "OP02-111", name: "Coated Cannonball", set: "Paramount War", setCode: "OP02", number: "111", type: "Event", color: "Yellow", rarity: "C", cost: 2 },
  { id: "OP02-112", name: "Burning Fist", set: "Paramount War", setCode: "OP02", number: "112", type: "Event", color: "Yellow", rarity: "C", cost: 3 },
  { id: "OP02-113", name: "Yasakani Sacred Jewel", set: "Paramount War", setCode: "OP02", number: "113", type: "Event", color: "Yellow", rarity: "C", cost: 4 },
  { id: "OP02-114", name: "Hell Memories", set: "Paramount War", setCode: "OP02", number: "114", type: "Event", color: "Blue", rarity: "C", cost: 4 },
  { id: "OP02-115", name: "Noble Strength", set: "Paramount War", setCode: "OP02", number: "115", type: "Event", color: "Blue", rarity: "C", cost: 1 },
  { id: "OP02-116", name: "Summit War", set: "Paramount War", setCode: "OP02", number: "116", type: "Event", color: "Blue", rarity: "C", cost: 5 },
  { id: "OP02-117", name: "Underground Trade Port", set: "Paramount War", setCode: "OP02", number: "117", type: "Stage", color: "Purple", rarity: "C", cost: 1 },
  { id: "OP02-118", name: "Moby Dick", set: "Paramount War", setCode: "OP02", number: "118", type: "Stage", color: "Black", rarity: "C", cost: 2 },
  { id: "OP02-119", name: "Marineford", set: "Paramount War", setCode: "OP02", number: "119", type: "Stage", color: "Blue", rarity: "C", cost: 1 },
  { id: "OP02-120", name: "Fool's Bow", set: "Paramount War", setCode: "OP02", number: "120", type: "Stage", color: "Blue", rarity: "C", cost: 1 },
  { id: "OP02-121", name: "Gran Tesoro", set: "Paramount War", setCode: "OP02", number: "121", type: "Stage", color: "Blue", rarity: "C", cost: 1 },

  // OP03 - Pillars of Strength
  { id: "OP03-001", name: "Donquixote Doflamingo", set: "Pillars of Strength", setCode: "OP03", number: "001", type: "Leader", color: "Purple", rarity: "L" },
  { id: "OP03-002", name: "Boa Hancock", set: "Pillars of Strength", setCode: "OP03", number: "002", type: "Leader", color: "Black", rarity: "L" },
  { id: "OP03-003", name: "Monkey D. Luffy", set: "Pillars of Strength", setCode: "OP03", number: "003", type: "Character", color: "Red", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP03-004", name: "Charlotte Linlin (Big Mom)", set: "Pillars of Strength", setCode: "OP03", number: "004", type: "Character", color: "Black", rarity: "SR", cost: 8, power: 10000 },
  { id: "OP03-005", name: "Kaido", set: "Pillars of Strength", setCode: "OP03", number: "005", type: "Character", color: "Purple", rarity: "SR", cost: 9, power: 12000 },
  { id: "OP03-006", name: "Roronoa Zoro", set: "Pillars of Strength", setCode: "OP03", number: "006", type: "Character", color: "Green", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP03-007", name: "Charlotte Katakuri", set: "Pillars of Strength", setCode: "OP03", number: "007", type: "Character", color: "Black", rarity: "SR", cost: 6, power: 7000 },
  { id: "OP03-008", name: "Yamato", set: "Pillars of Strength", setCode: "OP03", number: "008", type: "Character", color: "Purple", rarity: "SR", cost: 6, power: 7000 },

  // OP04 - Kingdoms of Intrigue
  { id: "OP04-001", name: "Kaido", set: "Kingdoms of Intrigue", setCode: "OP04", number: "001", type: "Leader", color: "Purple", rarity: "L" },
  { id: "OP04-002", name: "Charlotte Linlin (Big Mom)", set: "Kingdoms of Intrigue", setCode: "OP04", number: "002", type: "Leader", color: "Black", rarity: "L" },
  { id: "OP04-003", name: "Charlotte Katakuri", set: "Kingdoms of Intrigue", setCode: "OP04", number: "003", type: "Character", color: "Black", rarity: "SR", cost: 6, power: 7000 },
  { id: "OP04-004", name: "Yamato", set: "Kingdoms of Intrigue", setCode: "OP04", number: "004", type: "Character", color: "Purple", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP04-005", name: "Izo", set: "Kingdoms of Intrigue", setCode: "OP04", number: "005", type: "Character", color: "Black", rarity: "R", cost: 3, power: 4000 },
  { id: "OP04-006", name: "Jack", set: "Kingdoms of Intrigue", setCode: "OP04", number: "006", type: "Character", color: "Purple", rarity: "R", cost: 5, power: 6000 },
  { id: "OP04-007", name: "Queen", set: "Kingdoms of Intrigue", setCode: "OP04", number: "007", type: "Character", color: "Purple", rarity: "R", cost: 6, power: 7000 },
  { id: "OP04-008", name: "King", set: "Kingdoms of Intrigue", setCode: "OP04", number: "008", type: "Character", color: "Black", rarity: "SR", cost: 7, power: 8000 },

  // OP05 - Awakening of the New Era
  { id: "OP05-001", name: "Enel", set: "Awakening of the New Era", setCode: "OP05", number: "001", type: "Leader", color: "Yellow", rarity: "L" },
  { id: "OP05-002", name: "Shanks", set: "Awakening of the New Era", setCode: "OP05", number: "002", type: "Leader", color: "Red", rarity: "L" },
  { id: "OP05-003", name: "Rob Lucci", set: "Awakening of the New Era", setCode: "OP05", number: "003", type: "Character", color: "Black", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP05-004", name: "Kaku", set: "Awakening of the New Era", setCode: "OP05", number: "004", type: "Character", color: "Black", rarity: "R", cost: 4, power: 5000 },
  { id: "OP05-005", name: "Jabra", set: "Awakening of the New Era", setCode: "OP05", number: "005", type: "Character", color: "Black", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP05-006", name: "Stussy", set: "Awakening of the New Era", setCode: "OP05", number: "006", type: "Character", color: "Purple", rarity: "R", cost: 2, power: 3000 },
  { id: "OP05-007", name: "Vegapunk", set: "Awakening of the New Era", setCode: "OP05", number: "007", type: "Character", color: "Yellow", rarity: "SR", cost: 4, power: 4000 },

  // OP06 - Wings of the Captain
  { id: "OP06-001", name: "Monkey D. Garp", set: "Wings of the Captain", setCode: "OP06", number: "001", type: "Leader", color: "Blue", rarity: "L" },
  { id: "OP06-002", name: "Roronoa Zoro", set: "Wings of the Captain", setCode: "OP06", number: "002", type: "Leader", color: "Green", rarity: "L" },
  { id: "OP06-003", name: "Sengoku", set: "Wings of the Captain", setCode: "OP06", number: "003", type: "Character", color: "Yellow", rarity: "SR", cost: 7, power: 8000 },
  { id: "OP06-004", name: "Tsuru", set: "Wings of the Captain", setCode: "OP06", number: "004", type: "Character", color: "Blue", rarity: "R", cost: 3, power: 4000 },
  { id: "OP06-005", name: "Helmeppo", set: "Wings of the Captain", setCode: "OP06", number: "005", type: "Character", color: "Blue", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP06-006", name: "Koby", set: "Wings of the Captain", setCode: "OP06", number: "006", type: "Character", color: "Blue", rarity: "R", cost: 3, power: 3000 },

  // OP07 - Five Elders / 500 Years in the Future
  { id: "OP07-001", name: "Monkey D. Luffy (Gear 5)", set: "500 Years in the Future", setCode: "OP07", number: "001", type: "Leader", color: "Red", rarity: "L" },
  { id: "OP07-002", name: "Jewelry Bonney", set: "500 Years in the Future", setCode: "OP07", number: "002", type: "Leader", color: "Purple", rarity: "L" },
  { id: "OP07-003", name: "Monkey D. Luffy (Gear 5)", set: "500 Years in the Future", setCode: "OP07", number: "003", type: "Character", color: "Red", rarity: "SR", cost: 7, power: 8000 },
  { id: "OP07-004", name: "Jewelry Bonney", set: "500 Years in the Future", setCode: "OP07", number: "004", type: "Character", color: "Purple", rarity: "SR", cost: 5, power: 5000 },
  { id: "OP07-005", name: "Imu", set: "500 Years in the Future", setCode: "OP07", number: "005", type: "Character", color: "Black", rarity: "SR", cost: 8, power: 10000 },
  { id: "OP07-006", name: "Kizaru (Borsalino)", set: "500 Years in the Future", setCode: "OP07", number: "006", type: "Character", color: "Yellow", rarity: "SR", cost: 6, power: 7000 },
  { id: "OP07-007", name: "Saint Saturn", set: "500 Years in the Future", setCode: "OP07", number: "007", type: "Character", color: "Black", rarity: "SR", cost: 7, power: 9000 },

  // OP08 - Two Legends
  { id: "OP08-001", name: "Marshall D. Teach (Blackbeard)", set: "Two Legends", setCode: "OP08", number: "001", type: "Leader", color: "Black/Yellow", rarity: "L" },
  { id: "OP08-002", name: "Monkey D. Dragon", set: "Two Legends", setCode: "OP08", number: "002", type: "Leader", color: "Green/Purple", rarity: "L" },
  { id: "OP08-003", name: "Marshall D. Teach", set: "Two Legends", setCode: "OP08", number: "003", type: "Character", color: "Black", rarity: "SR", cost: 7, power: 9000 },
  { id: "OP08-004", name: "Monkey D. Dragon", set: "Two Legends", setCode: "OP08", number: "004", type: "Character", color: "Green", rarity: "SR", cost: 6, power: 7000 },
  { id: "OP08-005", name: "Sabo", set: "Two Legends", setCode: "OP08", number: "005", type: "Character", color: "Purple", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP08-006", name: "Koala", set: "Two Legends", setCode: "OP08", number: "006", type: "Character", color: "Green", rarity: "R", cost: 3, power: 4000 },
  { id: "OP08-007", name: "Shiryu", set: "Two Legends", setCode: "OP08", number: "007", type: "Character", color: "Black", rarity: "SR", cost: 5, power: 6000 },

  // Starter Decks
  { id: "ST01-001", name: "Monkey D. Luffy", set: "Straw Hat Crew", setCode: "ST01", number: "001", type: "Leader", color: "Red", rarity: "L" },
  { id: "ST01-002", name: "Roronoa Zoro", set: "Straw Hat Crew", setCode: "ST01", number: "002", type: "Character", color: "Red", rarity: "C", cost: 3, power: 5000 },
  { id: "ST01-003", name: "Nami", set: "Straw Hat Crew", setCode: "ST01", number: "003", type: "Character", color: "Red", rarity: "C", cost: 1, power: 1000 },
  { id: "ST02-001", name: "Crocodile", set: "Worst Generation", setCode: "ST02", number: "001", type: "Leader", color: "Blue", rarity: "L" },
  { id: "ST03-001", name: "Zephyr", set: "The Seven Warlords", setCode: "ST03", number: "001", type: "Leader", color: "Purple", rarity: "L" },
  { id: "ST04-001", name: "Nami", set: "Animal Kingdom Pirates", setCode: "ST04", number: "001", type: "Leader", color: "Green", rarity: "L" },
  { id: "ST05-001", name: "Sanji", set: "FILM Edition", setCode: "ST05", number: "001", type: "Leader", color: "Yellow", rarity: "L" },
  { id: "ST06-001", name: "Monkey D. Luffy", set: "Royal Seven Warriors", setCode: "ST06", number: "001", type: "Leader", color: "Red/Green", rarity: "L" },
  { id: "ST07-001", name: "Charlotte Linlin (Big Mom)", set: "Big Mom Pirates", setCode: "ST07", number: "001", type: "Leader", color: "Black/Yellow", rarity: "L" },
  { id: "ST08-001", name: "Monkey D. Luffy", set: "Monkey D. Luffy", setCode: "ST08", number: "001", type: "Leader", color: "Red", rarity: "L" },
  { id: "ST09-001", name: "Yamato", set: "Yamato", setCode: "ST09", number: "001", type: "Leader", color: "Purple", rarity: "L" },
  { id: "ST10-001", name: "Monkey D. Luffy (Uta)", set: "UTA from ONE PIECE FILM RED", setCode: "ST10", number: "001", type: "Leader", color: "Red/Green", rarity: "L" },
  { id: "ST12-001", name: "Roronoa Zoro", set: "Zoro and Sanji", setCode: "ST12", number: "001", type: "Leader", color: "Black/Green", rarity: "L" },
  { id: "ST13-001", name: "Vinsmoke Sanji", set: "Zoro and Sanji", setCode: "ST13", number: "001", type: "Leader", color: "Black/Yellow", rarity: "L" },
  { id: "ST17-001", name: "Monkey D. Luffy (Gear 5)", set: "One Piece Film Red", setCode: "ST17", number: "001", type: "Leader", color: "Red/Purple", rarity: "L" },
  { id: "ST18-001", name: "Marshall D. Teach (Blackbeard)", set: "Emperors of the Sea", setCode: "ST18", number: "001", type: "Leader", color: "Black/Purple", rarity: "L" },
  { id: "ST19-001", name: "Eustass Kid", set: "Emperors of the Sea", setCode: "ST19", number: "001", type: "Leader", color: "Red/Black", rarity: "L" },
  { id: "ST20-001", name: "Trafalgar Law (Polar Tang)", set: "Polar Tang", setCode: "ST20", number: "001", type: "Leader", color: "Blue/Black", rarity: "L" },

  // Extra OP01 staples
  { id: "OP01-018", name: "Eustass Kid", set: "Romance Dawn", setCode: "OP01", number: "018", type: "Character", color: "Green", rarity: "SR", cost: 8, power: 10000 },
  { id: "OP01-019", name: "Trafalgar Law", set: "Romance Dawn", setCode: "OP01", number: "019", type: "Character", color: "Green", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP01-020", name: "Jewelry Bonney", set: "Romance Dawn", setCode: "OP01", number: "020", type: "Character", color: "Green", rarity: "C", cost: 1, power: 1000 },
  { id: "OP01-021", name: "Zoro (Rush)", set: "Romance Dawn", setCode: "OP01", number: "021", type: "Character", color: "Red", rarity: "SR", cost: 3, power: 5000 },
  { id: "OP01-022", name: "Otama", set: "Romance Dawn", setCode: "OP01", number: "022", type: "Character", color: "Red", rarity: "C", cost: 1, power: 0 },
  { id: "OP01-023", name: "Gum-Gum Jet Pistol", set: "Romance Dawn", setCode: "OP01", number: "023", type: "Event", color: "Red", rarity: "R", cost: 2 },

  // Extra OP02 staples
  { id: "OP02-011", name: "Borsalino (Kizaru)", set: "Paramount War", setCode: "OP02", number: "011", type: "Character", color: "Yellow", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP02-012", name: "Jozu", set: "Paramount War", setCode: "OP02", number: "012", type: "Character", color: "Red", rarity: "R", cost: 3, power: 4000 },
  { id: "OP02-013", name: "Squard", set: "Paramount War", setCode: "OP02", number: "013", type: "Character", color: "Red", rarity: "R", cost: 4, power: 6000 },
  { id: "OP02-014", name: "Whitey Bay", set: "Paramount War", setCode: "OP02", number: "014", type: "Character", color: "Red", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP02-015", name: "Thatch", set: "Paramount War", setCode: "OP02", number: "015", type: "Character", color: "Black", rarity: "UC", cost: 2, power: 3000 },
  { id: "OP02-016", name: "Blamenco", set: "Paramount War", setCode: "OP02", number: "016", type: "Character", color: "Black", rarity: "UC", cost: 3, power: 4000 },

  // Extra OP03
  { id: "OP03-009", name: "Perona", set: "Pillars of Strength", setCode: "OP03", number: "009", type: "Character", color: "Purple", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP03-010", name: "Bartholomew Kuma", set: "Pillars of Strength", setCode: "OP03", number: "010", type: "Character", color: "Black", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP03-011", name: "Gecko Moria", set: "Pillars of Strength", setCode: "OP03", number: "011", type: "Character", color: "Purple", rarity: "SR", cost: 5, power: 6000 },

  // Extra OP04
  { id: "OP04-009", name: "Shinobu", set: "Kingdoms of Intrigue", setCode: "OP04", number: "009", type: "Character", color: "Green", rarity: "UC", cost: 2, power: 2000 },
  { id: "OP04-010", name: "Denjiro", set: "Kingdoms of Intrigue", setCode: "OP04", number: "010", type: "Character", color: "Green", rarity: "R", cost: 4, power: 5000 },
  { id: "OP04-011", name: "Kozuki Oden", set: "Kingdoms of Intrigue", setCode: "OP04", number: "011", type: "Character", color: "Green", rarity: "SR", cost: 8, power: 9000 },

  // Extra OP05
  { id: "OP05-008", name: "Kalifa", set: "Awakening of the New Era", setCode: "OP05", number: "008", type: "Character", color: "Black", rarity: "R", cost: 3, power: 4000 },
  { id: "OP05-009", name: "Blueno", set: "Awakening of the New Era", setCode: "OP05", number: "009", type: "Character", color: "Black", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP05-010", name: "Luffy (Film)", set: "Awakening of the New Era", setCode: "OP05", number: "010", type: "Character", color: "Red", rarity: "R", cost: 5, power: 7000 },

  // Extra OP06
  { id: "OP06-007", name: "Smoker", set: "Wings of the Captain", setCode: "OP06", number: "007", type: "Character", color: "Blue", rarity: "R", cost: 4, power: 5000 },
  { id: "OP06-008", name: "Tashigi", set: "Wings of the Captain", setCode: "OP06", number: "008", type: "Character", color: "Blue", rarity: "UC", cost: 2, power: 3000 },
  { id: "OP06-009", name: "Monkey D. Dragon", set: "Wings of the Captain", setCode: "OP06", number: "009", type: "Character", color: "Green", rarity: "SR", cost: 6, power: 7000 },

  // Extra OP07
  { id: "OP07-008", name: "Vegapunk Atlas", set: "500 Years in the Future", setCode: "OP07", number: "008", type: "Character", color: "Yellow", rarity: "R", cost: 3, power: 4000 },
  { id: "OP07-009", name: "Franky (Cyborg)", set: "500 Years in the Future", setCode: "OP07", number: "009", type: "Character", color: "Purple", rarity: "R", cost: 4, power: 6000 },
  { id: "OP07-010", name: "Dr. Vegapunk", set: "500 Years in the Future", setCode: "OP07", number: "010", type: "Character", color: "Yellow", rarity: "SR", cost: 5, power: 5000 },

  // Extra OP08
  { id: "OP08-008", name: "Magellan", set: "Two Legends", setCode: "OP08", number: "008", type: "Character", color: "Black", rarity: "R", cost: 5, power: 6000 },
  { id: "OP08-009", name: "Emporio Ivankov", set: "Two Legends", setCode: "OP08", number: "009", type: "Character", color: "Purple", rarity: "SR", cost: 6, power: 7000 },
  { id: "OP08-010", name: "Belo Betty", set: "Two Legends", setCode: "OP08", number: "010", type: "Character", color: "Green", rarity: "R", cost: 3, power: 4000 },
];

export function searchCards(query: string): Card[] {
  const q = query.toLowerCase().trim();
  if (!q) return SEED_CARDS.slice(0, 12);
  return SEED_CARDS.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.setCode.toLowerCase().includes(q) ||
      c.set.toLowerCase().includes(q) ||
      c.color.toLowerCase().includes(q) ||
      c.type.toLowerCase().includes(q)
  );
}

export function getCardById(id: string): Card | undefined {
  return SEED_CARDS.find((c) => c.id === id);
}

export function getCardsBySet(setCode: string): Card[] {
  return SEED_CARDS.filter((c) => c.setCode === setCode);
}

export const SETS = [
  { code: "OP01", name: "Romance Dawn" },
  { code: "OP02", name: "Paramount War" },
  { code: "OP03", name: "Pillars of Strength" },
  { code: "OP04", name: "Kingdoms of Intrigue" },
  { code: "OP05", name: "Awakening of the New Era" },
  { code: "OP06", name: "Wings of the Captain" },
  { code: "OP07", name: "500 Years in the Future" },
  { code: "OP08", name: "Two Legends" },
];
