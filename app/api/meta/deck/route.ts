import { NextRequest, NextResponse } from "next/server";
import https from "node:https";
import { getOfficialCardById } from "@/lib/official-cards";

type DeckCard = { id: string; name: string; count: number; imageUrl: string };
type DecklistSummary = {
  listId: string;
  format: string;
  place: string;
  player: string;
  tournament: string;
  region: string;
  score?: string;
  participants?: number | null;
  date?: string;
  spice?: number | null;
  cards: DeckCard[];
};

type GumGumLeaderDecklist = {
  id: string;
  region: string;
  set: string;
  date: string;
  country: string;
  author: string;
  placement?: number | null;
  placement_text?: string | null;
  tournament_type?: string | null;
  score?: string | null;
  event_name?: string | null;
  participants?: number | null;
  leader_id: string;
  leader_name?: string | null;
  decklist?: string | null;
  timestamp?: number | null;
  spice?: number | null;
  sideboard?: string | null;
};

const GUMGUM_BASE_URL = "https://gumgum.gg";
type GumGumRegion = "east" | "west";
const REQUEST_TIMEOUT_MS = 8000;

function fetchGumGumJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
        family: 4,
      },
      (res) => {
        const statusCode = res.statusCode || 0;
        let body = "";

        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if (statusCode < 200 || statusCode >= 300) {
            reject(new Error(`GumGum request failed with status ${statusCode}`));
            return;
          }

          try {
            resolve(JSON.parse(body) as T);
          } catch {
            reject(new Error("GumGum returned invalid JSON"));
          }
        });
      },
    );

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error("GumGum request timed out"));
    });
    req.on("error", reject);
  });
}

function normalizeLeaderId(value: string) {
  return value.trim().toUpperCase().split("_")[0] || value.trim().toUpperCase();
}

function mapRegionToGumGumBuckets(region: string): GumGumRegion[] {
  switch (region) {
    case "asia":
    case "east":
      return ["east"];
    case "na":
    case "eu":
    case "la":
    case "oc":
    case "west":
      return ["west"];
    case "global":
    default:
      return ["east", "west"];
  }
}

function parseDeckString(raw: string | null | undefined): DeckCard[] {
  if (!raw) return [];

  const entries = raw
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const cards: DeckCard[] = [];

  for (const entry of entries) {
    const match = /^(\d+)x([A-Z0-9-]+)$/i.exec(entry);
    if (!match) continue;

    const count = Number(match[1]);
    const cardId = match[2].trim().toUpperCase();
    if (!cardId || count <= 0) continue;

    const official = getOfficialCardById(cardId);
    cards.push({
      id: cardId,
      name: official?.name || cardId,
      count,
      imageUrl: `/api/card-image?id=${encodeURIComponent(cardId)}`,
    });
  }

  return cards;
}

function aggregateUsage(lists: DecklistSummary[]) {
  const map = new Map<string, { id: string; name: string; totalQty: number; inLists: number; imageUrl: string }>();
  const totalLists = Math.max(lists.length, 1);

  for (const list of lists) {
    const seenInList = new Set<string>();
    for (const card of list.cards) {
      const row = map.get(card.id) || {
        id: card.id,
        name: card.name,
        totalQty: 0,
        inLists: 0,
        imageUrl: card.imageUrl,
      };
      row.totalQty += card.count;
      if (!seenInList.has(card.id)) {
        row.inLists += 1;
        seenInList.add(card.id);
      }
      map.set(card.id, row);
    }
  }

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      avgQty: Number((row.totalQty / totalLists).toFixed(2)),
      usagePct: Number(((row.inLists / totalLists) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.usagePct - a.usagePct || b.avgQty - a.avgQty);
}

function placementLabel(row: GumGumLeaderDecklist) {
  if (row.placement_text && String(row.placement_text).trim()) {
    return String(row.placement_text).trim();
  }
  if (typeof row.placement === "number" && Number.isFinite(row.placement)) {
    return String(row.placement);
  }
  return "—";
}

function tournamentLabel(row: GumGumLeaderDecklist) {
  const eventName = String(row.event_name || "").trim();
  if (eventName) return eventName;

  const tournamentType = String(row.tournament_type || "").trim();
  const country = String(row.country || "").trim();
  if (tournamentType && country) return `${country} ${tournamentType}`;
  if (tournamentType) return tournamentType;
  if (country) return country;
  return "Decklist";
}

async function fetchLeaderDecklists(
  leaderId: string,
  format: string,
  region: string,
): Promise<GumGumLeaderDecklist[]> {
  const buckets = mapRegionToGumGumBuckets(region);
  const requests = buckets.map(async (bucket) => {
    const params = new URLSearchParams({
      set: format,
      region: bucket,
      leaderId,
    });

    const json = (await fetchGumGumJson<unknown>(`${GUMGUM_BASE_URL}/api/decklists/leader?${params.toString()}`).catch(
      () => [],
    )) as unknown;
    return Array.isArray(json) ? (json as GumGumLeaderDecklist[]) : [];
  });

  const settled = await Promise.allSettled(requests);
  const rows = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const seen = new Set<string>();

  return rows
    .filter((row) => {
      if (!row?.id || !row.decklist) return false;
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    })
    .sort((a, b) => {
      const tsA = typeof a.timestamp === "number" ? a.timestamp : Date.parse(a.date || "");
      const tsB = typeof b.timestamp === "number" ? b.timestamp : Date.parse(b.date || "");
      return tsB - tsA;
    });
}

export async function GET(req: NextRequest) {
  const requestedDeckId = (req.nextUrl.searchParams.get("deckId") || "").trim();
  const format = (req.nextUrl.searchParams.get("format") || "OP15").toUpperCase();
  const region = (req.nextUrl.searchParams.get("region") || "global").toLowerCase();
  const listLimit = Math.min(20, Math.max(1, Number(req.nextUrl.searchParams.get("lists") || 8)));

  if (!requestedDeckId) {
    return NextResponse.json({ error: "deckId is required" }, { status: 400 });
  }

  try {
    const leaderId = normalizeLeaderId(requestedDeckId);
    const rows = await fetchLeaderDecklists(leaderId, format, region);

    if (!rows.length) {
      return NextResponse.json(
        {
          requestedDeckId,
          format,
          region,
          cards: [],
          lists: [],
          usage: [],
          error: "No decklist found",
        },
        { status: 404 },
      );
    }

    const lists: DecklistSummary[] = rows.slice(0, listLimit).map((row) => ({
      listId: row.id,
      format: row.set,
      place: placementLabel(row),
      player: String(row.author || "Unknown").trim() || "Unknown",
      tournament: tournamentLabel(row),
      region: String(row.region || "").trim() || "Unknown",
      score: row.score || undefined,
      participants: row.participants ?? null,
      date: row.date || undefined,
      spice: typeof row.spice === "number" ? row.spice : null,
      cards: parseDeckString(row.decklist),
    }));

    const usage = aggregateUsage(lists);
    const representativeCards = lists[0]?.cards || [];

    return NextResponse.json(
      {
        deckId: leaderId,
        format,
        region,
        listCount: lists.length,
        lists,
        usage,
        count: representativeCards.length,
        cards: representativeCards,
        source: "community-decklists",
      },
      {
        status: 200,
        headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
      },
    );
  } catch {
    return NextResponse.json({ error: "Failed to fetch decklist" }, { status: 500 });
  }
}
