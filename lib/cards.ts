export interface Card {
  id: string;
  name: string;
  set: string;
  setCode: string;
  number: string;
  type: string;
  color: string;
  rarity: string;
  image?: string;
}

export const SEED_CARDS: Card[] = [
  { id: "OP01-001", name: "Monkey D. Luffy", set: "Romance Dawn", setCode: "OP01", number: "001", type: "Leader", color: "Red", rarity: "L" },
  { id: "OP01-002", name: "Roronoa Zoro", set: "Romance Dawn", setCode: "OP01", number: "002", type: "Character", color: "Green", rarity: "SR" },
  { id: "OP01-003", name: "Nami", set: "Romance Dawn", setCode: "OP01", number: "003", type: "Character", color: "Green", rarity: "R" },
  { id: "OP01-004", name: "Usopp", set: "Romance Dawn", setCode: "OP01", number: "004", type: "Character", color: "Green", rarity: "UC" },
  { id: "OP01-005", name: "Sanji", set: "Romance Dawn", setCode: "OP01", number: "005", type: "Character", color: "Red", rarity: "SR" },
  { id: "OP02-001", name: "Trafalgar Law", set: "Paramount War", setCode: "OP02", number: "001", type: "Leader", color: "Blue", rarity: "L" },
  { id: "OP02-002", name: "Portgas D. Ace", set: "Paramount War", setCode: "OP02", number: "002", type: "Character", color: "Red", rarity: "SR" },
  { id: "OP02-003", name: "Marco", set: "Paramount War", setCode: "OP02", number: "003", type: "Character", color: "Purple", rarity: "SR" },
  { id: "OP03-001", name: "Donquixote Doflamingo", set: "Pillars of Strength", setCode: "OP03", number: "001", type: "Leader", color: "Purple", rarity: "L" },
  { id: "OP03-002", name: "Boa Hancock", set: "Pillars of Strength", setCode: "OP03", number: "002", type: "Leader", color: "Black", rarity: "L" },
  { id: "OP04-001", name: "Kaido", set: "Kingdoms of Intrigue", setCode: "OP04", number: "001", type: "Leader", color: "Purple", rarity: "L" },
  { id: "OP04-002", name: "Big Mom", set: "Kingdoms of Intrigue", setCode: "OP04", number: "002", type: "Leader", color: "Black", rarity: "L" },
  { id: "OP04-003", name: "Charlotte Katakuri", set: "Kingdoms of Intrigue", setCode: "OP04", number: "003", type: "Character", color: "Black", rarity: "SR" },
  { id: "OP05-001", name: "Enel", set: "Awakening of the New Era", setCode: "OP05", number: "001", type: "Leader", color: "Yellow", rarity: "L" },
  { id: "OP05-002", name: "Shanks", set: "Awakening of the New Era", setCode: "OP05", number: "002", type: "Leader", color: "Red", rarity: "L" },
  { id: "OP05-003", name: "Rob Lucci", set: "Awakening of the New Era", setCode: "OP05", number: "003", type: "Character", color: "Black", rarity: "SR" },
  { id: "OP06-001", name: "Monkey D. Garp", set: "Wings of the Captain", setCode: "OP06", number: "001", type: "Leader", color: "Blue", rarity: "L" },
  { id: "OP06-002", name: "Sengoku", set: "Wings of the Captain", setCode: "OP06", number: "002", type: "Character", color: "Yellow", rarity: "SR" },
  { id: "OP07-001", name: "Monkey D. Luffy (Gear 5)", set: "Five Elders", setCode: "OP07", number: "001", type: "Leader", color: "Red", rarity: "L" },
  { id: "OP08-001", name: "Blackbeard", set: "Two Legends", setCode: "OP08", number: "001", type: "Leader", color: "Black/Yellow", rarity: "L" },
  { id: "ST01-001", name: "Monkey D. Luffy", set: "Starter Deck: Straw Hat Crew", setCode: "ST01", number: "001", type: "Leader", color: "Red", rarity: "L" },
  { id: "ST02-001", name: "Crocodile", set: "Starter Deck: Worst Generation", setCode: "ST02", number: "001", type: "Leader", color: "Blue", rarity: "L" },
  { id: "ST03-001", name: "Zephyr", set: "Starter Deck: The Seven Warlords", setCode: "ST03", number: "001", type: "Leader", color: "Purple", rarity: "L" },
  { id: "ST10-001", name: "Monkey D. Luffy", set: "Starter Deck: UTA", setCode: "ST10", number: "001", type: "Leader", color: "Red/Green", rarity: "L" },
];

export function searchCards(query: string): Card[] {
  const q = query.toLowerCase().trim();
  if (!q) return SEED_CARDS.slice(0, 10);
  return SEED_CARDS.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.setCode.toLowerCase().includes(q) ||
      c.set.toLowerCase().includes(q)
  );
}
