import type { Card } from "@/lib/cards";

const BASE = "https://onepiece.limitlesstcg.com";

function mapLimitless(raw: any): Card | null {
  if (!raw?.card_id || !raw?.name) return null;
  const id = String(raw.card_id).toUpperCase();
  const number = String(raw.number ?? "").padStart(3, "0");

  const c: Card = {
    id,
    name: String(raw.name),
    set: String(raw.set_name || raw.set || ""),
    setCode: String(raw.set || id.split("-")[0] || "").toUpperCase(),
    number: number || id.split("-")[1] || "",
    type: String(raw.category || "").replace(/^./, (m) => m.toUpperCase()),
    color: String(raw.color || "").replace(/^./, (m) => m.toUpperCase()),
    rarity: String(raw.rarity || ""),
    cost: raw.cost == null ? undefined : Number(raw.cost),
    power: raw.power == null ? undefined : Number(raw.power),
    attribute: raw.attribute ? String(raw.attribute) : undefined,
    imageUrl: `/api/card-image?id=${id}`,
  };
  return c;
}

export async function fetchLimitlessVariantsById(id: string, maxVariants = 12): Promise<Card[]> {
  const cardId = id.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,5}-\d{3}$/.test(cardId)) return [];

  const out: Card[] = [];
  let misses = 0;

  for (let v = 0; v < maxVariants; v++) {
    try {
      const res = await fetch(`${BASE}/api/cards/${cardId}?v=${v}`, {
        headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
        next: { revalidate: 3600 },
      });

      if (!res.ok) {
        misses++;
        if (misses >= 3) break;
        continue;
      }

      const text = await res.text();
      if (!text || text.trim().length < 2) {
        misses++;
        if (misses >= 3) break;
        continue;
      }

      let raw: any;
      try {
        raw = JSON.parse(text);
      } catch {
        misses++;
        if (misses >= 3) break;
        continue;
      }

      const card = mapLimitless(raw);
      if (card) out.push(card);
      misses = 0;
    } catch {
      misses++;
      if (misses >= 3) break;
    }
  }

  // dedupe by name+setCode+number (keep alt arts as separate if number differs)
  const seen = new Set<string>();
  return out.filter((c) => {
    const k = `${c.id}|${c.name}|${c.setCode}|${c.number}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
