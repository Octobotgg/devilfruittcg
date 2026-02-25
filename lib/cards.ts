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

  // OP02 - Paramount War
  { id: "OP02-001", name: "Trafalgar Law", set: "Paramount War", setCode: "OP02", number: "001", type: "Leader", color: "Blue", rarity: "L" },
  { id: "OP02-002", name: "Edward Newgate (Whitebeard)", set: "Paramount War", setCode: "OP02", number: "002", type: "Leader", color: "Black", rarity: "L" },
  { id: "OP02-003", name: "Portgas D. Ace", set: "Paramount War", setCode: "OP02", number: "003", type: "Character", color: "Red", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP02-004", name: "Marco", set: "Paramount War", setCode: "OP02", number: "004", type: "Character", color: "Purple", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP02-005", name: "Vista", set: "Paramount War", setCode: "OP02", number: "005", type: "Character", color: "Black", rarity: "R", cost: 3, power: 4000 },
  { id: "OP02-006", name: "Monkey D. Garp", set: "Paramount War", setCode: "OP02", number: "006", type: "Character", color: "Blue", rarity: "SR", cost: 6, power: 7000 },
  { id: "OP02-007", name: "Sengoku", set: "Paramount War", setCode: "OP02", number: "007", type: "Character", color: "Yellow", rarity: "SR", cost: 7, power: 8000 },
  { id: "OP02-008", name: "Aokiji", set: "Paramount War", setCode: "OP02", number: "008", type: "Character", color: "Blue", rarity: "SR", cost: 6, power: 7000 },
  { id: "OP02-009", name: "Kizaru", set: "Paramount War", setCode: "OP02", number: "009", type: "Character", color: "Yellow", rarity: "SR", cost: 6, power: 7000 },
  { id: "OP02-010", name: "Akainu", set: "Paramount War", setCode: "OP02", number: "010", type: "Character", color: "Black", rarity: "SR", cost: 7, power: 9000 },

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
