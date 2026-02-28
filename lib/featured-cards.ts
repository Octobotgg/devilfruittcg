export type FeaturedCard = {
  id: string;
  name: string;
  set?: string;
  rotate?: number;
  z?: number;
  y?: number;
};

export const HOME_FEATURED_CARDS: FeaturedCard[] = [
  { id: "OP01-001", name: "Roronoa Zoro", rotate: -25, z: -100, y: 20 },
  { id: "OP02-001", name: "Edward Newgate", rotate: -12, z: -50, y: 10 },
  { id: "OP09-118", name: "Gol D. Roger", rotate: 0, z: 0, y: 0 },
  { id: "OP01-120", name: "Shanks", rotate: 12, z: -50, y: 10 },
  { id: "OP01-061", name: "Kaido", rotate: 25, z: -100, y: 20 },
];

export const MARKET_HOT_CARDS: FeaturedCard[] = [
  { id: "OP01-120", name: "Shanks", set: "OP01" },
  { id: "OP01-001", name: "Roronoa Zoro", set: "OP01" },
  { id: "OP09-118", name: "Gol D. Roger", set: "OP09" },
  { id: "OP02-001", name: "Edward Newgate", set: "OP02" },
  { id: "OP01-061", name: "Kaido", set: "OP01" },
  { id: "OP06-007", name: "Shanks", set: "OP06" },
];
