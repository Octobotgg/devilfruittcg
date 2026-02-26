import { Card } from "./cards";

// 500 Years in the Future (OP07) - Key cards
const OP07_CARDS: Card[] = [
  // Leaders
  { id: "OP07-001", name: "Monkey D. Luffy", set: "500 Years in the Future", setCode: "OP07", number: "001", type: "Leader", color: "Red/Black", rarity: "L", cost: 0, power: 5000 },
  { id: "OP07-002", name: "Nico Robin", set: "500 Years in the Future", setCode: "OP07", number: "002", type: "Leader", color: "Purple", rarity: "L", cost: 0, power: 5000 },
  { id: "OP07-003", name: "Jewelry Bonney", set: "500 Years in the Future", setCode: "OP07", number: "003", type: "Leader", color: "Yellow", rarity: "L", cost: 0, power: 5000 },
  { id: "OP07-004", name: "Trafalgar Law", set: "500 Years in the Future", setCode: "OP07", number: "004", type: "Leader", color: "Green", rarity: "L", cost: 0, power: 5000 },
  { id: "OP07-005", name: "Eustass Kid", set: "500 Years in the Future", setCode: "OP07", number: "005", type: "Leader", color: "Red", rarity: "L", cost: 0, power: 5000 },
  { id: "OP07-006", name: "Kaido", set: "500 Years in the Future", setCode: "OP07", number: "006", type: "Leader", color: "Purple", rarity: "L", cost: 0, power: 5000 },
  { id: "OP07-007", name: "Vegapunk (Shaka)", set: "500 Years in the Future", setCode: "OP07", number: "007", type: "Leader", color: "Blue/Yellow", rarity: "L", cost: 0, power: 5000 },
  { id: "OP07-008", name: "Vegapunk (Atlas)", set: "500 Years in the Future", setCode: "OP07", number: "008", type: "Leader", color: "Blue/Yellow", rarity: "L", cost: 0, power: 5000 },
  
  // Red Cards (Egghead)
  { id: "OP07-009", name: "Monkey D. Luffy", set: "500 Years in the Future", setCode: "OP07", number: "009", type: "Character", color: "Red", rarity: "SR", cost: 8, power: 9000 },
  { id: "OP07-010", name: "Rob Lucci", set: "500 Years in the Future", setCode: "OP07", number: "010", type: "Character", color: "Red", rarity: "SR", cost: 6, power: 7000 },
  { id: "OP07-011", name: "S-Bear", set: "500 Years in the Future", setCode: "OP07", number: "011", type: "Character", color: "Red", rarity: "R", cost: 4, power: 5000 },
  { id: "OP07-012", name: "S-Hawk", set: "500 Years in the Future", setCode: "OP07", number: "012", type: "Character", color: "Red", rarity: "R", cost: 4, power: 5000 },
  { id: "OP07-013", name: "Sentomaru", set: "500 Years in the Future", setCode: "OP07", number: "013", type: "Character", color: "Red", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP07-014", name: "Hibari", set: "500 Years in the Future", setCode: "OP07", number: "014", type: "Character", color: "Red", rarity: "C", cost: 2, power: 2000 },
  { id: "OP07-015", name: "Kaku", set: "500 Years in the Future", setCode: "OP07", number: "015", type: "Character", color: "Red", rarity: "R", cost: 4, power: 5000 },
  { id: "OP07-016", name: "Stussy", set: "500 Years in the Future", setCode: "OP07", number: "016", type: "Character", color: "Red", rarity: "R", cost: 3, power: 3000 },
  { id: "OP07-017", name: "Funkfreed", set: "500 Years in the Future", setCode: "OP07", number: "017", type: "Character", color: "Red", rarity: "C", cost: 3, power: 5000 },
  { id: "OP07-018", name: "Guernica", set: "500 Years in the Future", setCode: "OP07", number: "018", type: "Character", color: "Red", rarity: "C", cost: 2, power: 3000 },
  { id: "OP07-019", name: "Joseph", set: "500 Years in the Future", setCode: "OP07", number: "019", type: "Character", color: "Red", rarity: "C", cost: 3, power: 4000 },
  { id: "OP07-020", name: "Gismonda", set: "500 Years in the Future", setCode: "OP07", number: "020", type: "Character", color: "Red", rarity: "C", cost: 4, power: 5000 },
  { id: "OP07-021", name: "Spandam", set: "500 Years in the Future", setCode: "OP07", number: "021", type: "Character", color: "Red", rarity: "C", cost: 1, power: 2000 },
  
  // Green Cards (Heart Pirates)
  { id: "OP07-022", name: "Trafalgar Law", set: "500 Years in the Future", setCode: "OP07", number: "022", type: "Character", color: "Green", rarity: "SR", cost: 6, power: 7000 },
  { id: "OP07-023", name: "Jean Bart", set: "500 Years in the Future", setCode: "OP07", number: "023", type: "Character", color: "Green", rarity: "R", cost: 5, power: 6000 },
  { id: "OP07-024", name: "Bepo", set: "500 Years in the Future", setCode: "OP07", number: "024", type: "Character", color: "Green", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP07-025", name: "Penguin", set: "500 Years in the Future", setCode: "OP07", number: "025", type: "Character", color: "Green", rarity: "C", cost: 2, power: 3000 },
  { id: "OP07-026", name: "Shachi", set: "500 Years in the Future", setCode: "OP07", number: "026", type: "Character", color: "Green", rarity: "C", cost: 2, power: 3000 },
  { id: "OP07-027", name: "Clione", set: "500 Years in the Future", setCode: "OP07", number: "027", type: "Character", color: "Green", rarity: "C", cost: 2, power: 3000 },
  { id: "OP07-028", name: "Hakugan", set: "500 Years in the Future", setCode: "OP07", number: "028", type: "Character", color: "Green", rarity: "C", cost: 2, power: 3000 },
  { id: "OP07-029", name: "Uni", set: "500 Years in the Future", setCode: "OP07", number: "029", type: "Character", color: "Green", rarity: "C", cost: 2, power: 3000 },
  { id: "OP07-030", name: "Ikkaku", set: "500 Years in the Future", setCode: "OP07", number: "030", type: "Character", color: "Green", rarity: "C", cost: 1, power: 1000 },
  { id: "OP07-031", name: "Polar Tang", set: "500 Years in the Future", setCode: "OP07", number: "031", type: "Stage", color: "Green", rarity: "R", cost: 1 },
  
  // Blue Cards (Vegapunk)
  { id: "OP07-032", name: "Vegapunk (Lilith)", set: "500 Years in the Future", setCode: "OP07", number: "032", type: "Character", color: "Blue", rarity: "R", cost: 2, power: 3000 },
  { id: "OP07-033", name: "Vegapunk (Edison)", set: "500 Years in the Future", setCode: "OP07", number: "033", type: "Character", color: "Blue", rarity: "R", cost: 3, power: 3000 },
  { id: "OP07-034", name: "Vegapunk (Pythagoras)", set: "500 Years in the Future", setCode: "OP07", number: "034", type: "Character", color: "Blue", rarity: "R", cost: 3, power: 4000 },
  { id: "OP07-035", name: "Vegapunk (York)", set: "500 Years in the Future", setCode: "OP07", number: "035", type: "Character", color: "Blue", rarity: "R", cost: 2, power: 2000 },
  { id: "OP07-036", name: "Vegapunk (Shaka)", set: "500 Years in the Future", setCode: "OP07", number: "036", type: "Character", color: "Blue", rarity: "R", cost: 4, power: 5000 },
  { id: "OP07-037", name: "Vegapunk (Atlas)", set: "500 Years in the Future", setCode: "OP07", number: "037", type: "Character", color: "Blue", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP07-038", name: "S-Snake", set: "500 Years in the Future", setCode: "OP07", number: "038", type: "Character", color: "Blue", rarity: "R", cost: 3, power: 4000 },
  { id: "OP07-039", name: "S-Shark", set: "500 Years in the Future", setCode: "OP07", number: "039", type: "Character", color: "Blue", rarity: "R", cost: 3, power: 4000 },
  { id: "OP07-040", name: "Bonney", set: "500 Years in the Future", setCode: "OP07", number: "040", type: "Character", color: "Blue", rarity: "R", cost: 3, power: 4000 },
  { id: "OP07-041", name: "Kizaru", set: "500 Years in the Future", setCode: "OP07", number: "041", type: "Character", color: "Blue", rarity: "SR", cost: 8, power: 9000 },
  { id: "OP07-042", name: "Kaku", set: "500 Years in the Future", setCode: "OP07", number: "042", type: "Character", color: "Blue", rarity: "R", cost: 4, power: 5000 },
  { id: "OP07-043", name: "Stussy", set: "500 Years in the Future", setCode: "OP07", number: "043", type: "Character", color: "Blue", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP07-044", name: "Pacifista", set: "500 Years in the Future", setCode: "OP07", number: "044", type: "Character", color: "Blue", rarity: "UC", cost: 5, power: 6000 },
  { id: "OP07-045", name: "Rob Lucci", set: "500 Years in the Future", setCode: "OP07", number: "045", type: "Character", color: "Blue", rarity: "R", cost: 5, power: 6000 },
  { id: "OP07-046", name: "Hattori", set: "500 Years in the Future", setCode: "OP07", number: "046", type: "Character", color: "Blue", rarity: "C", cost: 1, power: 0 },
  { id: "OP07-047", name: "Bubble Shield", set: "500 Years in the Future", setCode: "OP07", number: "047", type: "Event", color: "Blue", rarity: "UC", cost: 1 },
  
  // Purple Cards (Kaido/Onigashima)
  { id: "OP07-048", name: "Kaido", set: "500 Years in the Future", setCode: "OP07", number: "048", type: "Character", color: "Purple", rarity: "SR", cost: 9, power: 10000 },
  { id: "OP07-049", name: "King", set: "500 Years in the Future", setCode: "OP07", number: "049", type: "Character", color: "Purple", rarity: "R", cost: 5, power: 6000 },
  { id: "OP07-050", name: "Queen", set: "500 Years in the Future", setCode: "OP07", number: "050", type: "Character", color: "Purple", rarity: "R", cost: 4, power: 5000 },
  { id: "OP07-051", name: "Jack", set: "500 Years in the Future", setCode: "OP07", number: "051", type: "Character", color: "Purple", rarity: "R", cost: 4, power: 5000 },
  { id: "OP07-052", name: "Ulti", set: "500 Years in the Future", setCode: "OP07", number: "052", type: "Character", color: "Purple", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP07-053", name: "Page One", set: "500 Years in the Future", setCode: "OP07", number: "053", type: "Character", color: "Purple", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP07-054", name: "Sasaki", set: "500 Years in the Future", setCode: "OP07", number: "054", type: "Character", color: "Purple", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP07-055", name: "Black Maria", set: "500 Years in the Future", setCode: "OP07", number: "055", type: "Character", color: "Purple", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP07-056", name: "Who's-Who", set: "500 Years in the Future", setCode: "OP07", number: "056", type: "Character", color: "Purple", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP07-057", name: "Hatcha", set: "500 Years in the Future", setCode: "OP07", number: "057", type: "Character", color: "Purple", rarity: "C", cost: 4, power: 5000 },
  { id: "OP07-058", name: "Nokokuwa Police", set: "500 Years in the Future", setCode: "OP07", number: "058", type: "Character", color: "Purple", rarity: "C", cost: 3, power: 4000 },
  { id: "OP07-059", name: "Poker", set: "500 Years in the Future", setCode: "OP07", number: "059", type: "Character", color: "Purple", rarity: "C", cost: 2, power: 3000 },
  { id: "OP07-060", name: "Mizerka", set: "500 Years in the Future", setCode: "OP07", number: "060", type: "Character", color: "Purple", rarity: "C", cost: 2, power: 3000 },
  { id: "OP07-061", name: "Briscola", set: "500 Years in the Future", setCode: "OP07", number: "061", type: "Character", color: "Purple", rarity: "C", cost: 2, power: 3000 },
  { id: "OP07-062", name: "Hamlet", set: "500 Years in the Future", setCode: "OP07", number: "062", type: "Character", color: "Purple", rarity: "C", cost: 2, power: 3000 },
  { id: "OP07-063", name: "Babanuki", set: "500 Years in the Future", setCode: "OP07", number: "063", type: "Character", color: "Purple", rarity: "C", cost: 4, power: 5000 },
  { id: "OP07-064", name: "Daifugo", set: "500 Years in the Future", setCode: "OP07", number: "064", type: "Character", color: "Purple", rarity: "C", cost: 3, power: 4000 },
  { id: "OP07-065", name: "Solitaire", set: "500 Years in the Future", setCode: "OP07", number: "065", type: "Character", color: "Purple", rarity: "C", cost: 3, power: 4000 },
  { id: "OP07-066", name: "Pleasures", set: "500 Years in the Future", setCode: "OP07", number: "066", type: "Character", color: "Purple", rarity: "C", cost: 1, power: 2000 },
  { id: "OP07-067", name: "Waiters", set: "500 Years in the Future", setCode: "OP07", number: "067", type: "Character", color: "Purple", rarity: "C", cost: 1, power: 2000 },
  { id: "OP07-068", name: "Gifter", set: "500 Years in the Future", setCode: "OP07", number: "068", type: "Character", color: "Purple", rarity: "C", cost: 1, power: 2000 },
  
  // Yellow Cards (Bonney/Kuma)
  { id: "OP07-069", name: "Jewelry Bonney", set: "500 Years in the Future", setCode: "OP07", number: "069", type: "Character", color: "Yellow", rarity: "SR", cost: 3, power: 3000 },
  { id: "OP07-070", name: "Bartholomew Kuma", set: "500 Years in the Future", setCode: "OP07", number: "070", type: "Character", color: "Yellow", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP07-071", name: "Ginny", set: "500 Years in the Future", setCode: "OP07", number: "071", type: "Character", color: "Yellow", rarity: "R", cost: 1, power: 0 },
  { id: "OP07-072", name: "Ivankov", set: "500 Years in the Future", setCode: "OP07", number: "072", type: "Character", color: "Yellow", rarity: "R", cost: 4, power: 5000 },
  { id: "OP07-073", name: "Emporio Ivankov", set: "500 Years in the Future", setCode: "OP07", number: "073", type: "Character", color: "Yellow", rarity: "R", cost: 4, power: 5000 },
  { id: "OP07-074", name: "Kuma", set: "500 Years in the Future", setCode: "OP07", number: "074", type: "Character", color: "Yellow", rarity: "R", cost: 3, power: 4000 },
  { id: "OP07-075", name: "Bartholomew Kuma", set: "500 Years in the Future", setCode: "OP07", number: "075", type: "Character", color: "Yellow", rarity: "R", cost: 4, power: 5000 },
  { id: "OP07-076", name: "Dragon", set: "500 Years in the Future", setCode: "OP07", number: "076", type: "Character", color: "Yellow", rarity: "R", cost: 8, power: 8000 },
  { id: "OP07-077", name: "Sabo", set: "500 Years in the Future", setCode: "OP07", number: "077", type: "Character", color: "Yellow", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP07-078", name: "Koala", set: "500 Years in the Future", setCode: "OP07", number: "078", type: "Character", color: "Yellow", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP07-079", name: "Hack", set: "500 Years in the Future", setCode: "OP07", number: "079", type: "Character", color: "Yellow", rarity: "C", cost: 3, power: 4000 },
  { id: "OP07-080", name: "Nico Robin", set: "500 Years in the Future", setCode: "OP07", number: "080", type: "Character", color: "Yellow", rarity: "SR", cost: 5, power: 5000 },
  { id: "OP07-081", name: "Sentomaru", set: "500 Years in the Future", setCode: "OP07", number: "081", type: "Character", color: "Yellow", rarity: "UC", cost: 3, power: 4000 },
  
  // Black Cards (CP0)
  { id: "OP07-082", name: "Rob Lucci", set: "500 Years in the Future", setCode: "OP07", number: "082", type: "Character", color: "Black", rarity: "SR", cost: 6, power: 7000 },
  { id: "OP07-083", name: "Kaku", set: "500 Years in the Future", setCode: "OP07", number: "083", type: "Character", color: "Black", rarity: "R", cost: 4, power: 5000 },
  { id: "OP07-084", name: "Stussy", set: "500 Years in the Future", setCode: "OP07", number: "084", type: "Character", color: "Black", rarity: "UC", cost: 3, power: 4000 },
  { id: "OP07-085", name: "Guernica", set: "500 Years in the Future", setCode: "OP07", number: "085", type: "Character", color: "Black", rarity: "C", cost: 3, power: 4000 },
  { id: "OP07-086", name: "Joseph", set: "500 Years in the Future", setCode: "OP07", number: "086", type: "Character", color: "Black", rarity: "C", cost: 2, power: 3000 },
  { id: "OP07-087", name: "Gismonda", set: "500 Years in the Future", setCode: "OP07", number: "087", type: "Character", color: "Black", rarity: "C", cost: 3, power: 4000 },
  { id: "OP07-088", name: "Spandam", set: "500 Years in the Future", setCode: "OP07", number: "088", type: "Character", color: "Black", rarity: "C", cost: 1, power: 2000 },
  
  // Secret Rares
  { id: "OP07-089", name: "Monkey D. Luffy", set: "500 Years in the Future", setCode: "OP07", number: "089", type: "Character", color: "Red", rarity: "SEC", cost: 8, power: 9000 },
  { id: "OP07-090", name: "Rob Lucci", set: "500 Years in the Future", setCode: "OP07", number: "090", type: "Character", color: "Red", rarity: "SEC", cost: 6, power: 7000 },
  { id: "OP07-091", name: "Kizaru", set: "500 Years in the Future", setCode: "OP07", number: "091", type: "Character", color: "Blue", rarity: "SEC", cost: 8, power: 9000 },
  { id: "OP07-092", name: "Trafalgar Law", set: "500 Years in the Future", setCode: "OP07", number: "092", type: "Character", color: "Green", rarity: "SEC", cost: 6, power: 7000 },
  { id: "OP07-093", name: "Bartholomew Kuma", set: "500 Years in the Future", setCode: "OP07", number: "093", type: "Character", color: "Yellow", rarity: "SEC", cost: 5, power: 6000 },
  { id: "OP07-094", name: "Jewelry Bonney", set: "500 Years in the Future", setCode: "OP07", number: "094", type: "Character", color: "Yellow", rarity: "SEC", cost: 3, power: 3000 },
  { id: "OP07-095", name: "Kaido", set: "500 Years in the Future", setCode: "OP07", number: "095", type: "Character", color: "Purple", rarity: "SEC", cost: 9, power: 10000 }
];

export default OP07_CARDS;
