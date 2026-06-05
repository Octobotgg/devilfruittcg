import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const dataPath = path.join(repoRoot, "data", "bandai-en-official-cards.json");

const cards = JSON.parse(fs.readFileSync(dataPath, "utf8"));

function getBaseId(id) {
  return String(id).replace(/_[A-Za-z0-9]+$/u, "");
}

function getVariantCode(id) {
  const match = /_([A-Za-z0-9]+)$/u.exec(String(id));
  return match ? match[1].toLowerCase() : null;
}

function slugify(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[’'"]/gu, "")
    .replace(/&/gu, " and ")
    .replace(/[^a-zA-Z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .replace(/_+/gu, "_")
    .toLowerCase();
}

function normalizeText(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[’'"]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

const KNOWN_SET_QUALIFIERS = [
  [/cs 25[- ]26 event pack finalist ver\.?/i, "cs_25_26_event_pack_finalist_ver"],
  [/cs 25[- ]26 event pack/i, "cs_25_26_event_pack"],
  [/cs 25[- ]26 celebration pack/i, "cs_25_26_celebration_pack"],
  [/cs 25[- ]26 finalist card set ?(\d+)/i, (_, setNo) => `cs_25_26_finalist_card_set_${setNo}`],
  [/cs 25[- ]26 winner card set ?(\d+)/i, (_, setNo) => `cs_25_26_winner_card_set_${setNo}`],
  [/cs 25[- ]26 top player pack ?(\d+)/i, (_, packNo) => `cs_25_26_top_player_pack_${packNo}`],
  [/cs 25[- ]26 top player pack/i, "cs_25_26_top_player_pack"],
  [/regional 2024 wave ?(\d+)/i, (_, wave) => `regional_2024_wave_${wave}`],
  [/regionals? wave ?(\d+)/i, (_, wave) => `regionals_wave_${wave}`],
  [/regional 25[- ]26 season ?(\d+)/i, (_, season) => `regional_25_26_season_${season}`],
  [/regionals? season ?(\d+)/i, (_, season) => `regionals_season_${season}`],
  [/championship 25[- ]26 offline regionals season ?(\d+)/i, (_, season) => `championship_25_26_offline_regionals_season_${season}`],
  [/championship 25[- ]26 finals season ?(\d+)/i, (_, season) => `championship_25_26_finals_season_${season}`],
  [/winner prize for sealed battle (\d{4}) vol\.? ?(\d+)/i, (_, year, vol) => `sealed_battle_${year}_vol_${vol}_winner`],
  [/winner prize for sealed battle/i, "sealed_battle_winner"],
  [/tournament pack (\d{4}) ([a-z]{3})\.-([a-z]{3})\./i, (_, year, from, to) => `tournament_pack_${year}_${from.toLowerCase()}_${to.toLowerCase()}`],
  [/premium card collection .*best selection/i, "best_selection"],
  [/japanese 3rd anniversary set/i, "japanese_3rd_anniversary_set"],
  [/japanese 2nd anniversary set/i, "japanese_2nd_anniversary_set"],
  [/extra grand battle for stores (\d{4}) may/i, (_, year) => `extra_grand_battle_for_stores_${year}_may`],
  [/dodgers one piece night/i, "dodgers_one_piece_night"],
  [/super pre-?release/i, "super_pre_release"],
  [/op-?(\d+) release event/i, (_, setNo) => `op${setNo.padStart(2, "0")}_release_event`],
  [/one piece day dallas/i, "one_piece_day_dallas"],
  [/football team dortmund collaboration event/i, "dortmund_collaboration_event"],
  [/offline regional participation pack/i, "offline_regional_participation"],
  [/offline regional finalist card set/i, "offline_regional_finalist"],
  [/offline regional champion card set/i, "offline_regional_champion"],
  [/online regional participation pack/i, "online_regional_participation"],
  [/online regional finalist card set/i, "online_regional_finalist"],
  [/online regional champion card set/i, "online_regional_champion"],
  [/championship .* finals/i, "championship_finals"],
  [/pirates league store qualifier/i, "pirates_league_store_qualifier"],
  [/pirates league three captains battle/i, "pirates_league_three_captains_battle"],
  [/cs 25 26 top player pack/i, "top_player_pack"],
  [/top player pack/i, "top_player_pack"],
  [/cs 25 26 finali(?:st|s?t) card set/i, "finalist_card_set"],
  [/winner card set/i, "winner_card_set"],
  [/winner pack/i, "winner_pack"],
  [/event pack/i, "event_pack"],
  [/celebration pack/i, "celebration_pack"],
  [/tournament pack vol\.? ?(\d+)/i, (_, vol) => `tournament_pack_vol_${vol}`],
  [/tournament kit (\d{4}) vol\.? ?(\d+)/i, (_, year, vol) => `tournament_kit_${year}_vol_${vol}`],
  [/store treasure cup/i, "store_treasure_cup"],
  [/treasure cup/i, "treasure_cup"],
  [/premium card collection .*25th edition/i, "25th_edition"],
  [/premium card collection .*film red edition/i, "film_red_edition"],
  [/premium card collection .*live action edition/i, "live_action_edition"],
  [/gift collection 2023/i, "gift_collection_2023"],
  [/special goods set/i, "special_goods_set"],
  [/official playmat limited edition vol ?(\d+)/i, (_, vol) => `official_playmat_limited_edition_vol_${vol}`],
  [/illustration box vol ?(\d+)/i, (_, vol) => `illustration_box_vol_${vol}`],
  [/learn together deck set/i, "learn_together_deck_set"],
  [/seven warlords of the sea binder set/i, "seven_warlords_binder_set"],
  [/bandai card games fest/i, "bandai_card_games_fest"],
  [/english version 1st anniversary set/i, "english_1st_anniversary"],
  [/3rd anniversary event/i, "third_anniversary_event"],
  [/25th edition/i, "25th_edition"],
  [/new year event/i, "new_year_event"],
  [/one piece heroines campaign dash pack/i, "heroines_campaign_dash_pack"],
  [/psa exclusive promo card/i, "psa_exclusive_promo"],
  [/store 2[- ]on[- ]2 battle/i, "store_2_on_2_battle"],
  [/prb-?02/i, "prb02"],
  [/prb-?01/i, "prb01"],
  [/gc-?01/i, "gc01"],
  [/\bst-?(\d+)\b/i, (_, deck) => `st${deck}`],
  [/\bop-?(\d+)\b/i, (_, set) => `op${set.padStart(2, "0")}`],
  [/\beb-?(\d+)\b/i, (_, set) => `eb${set.padStart(2, "0")}`],
  [/\bp-(\d+)\b/i, (_, promo) => `p${promo}`],
];

function inferSemanticSlug(card) {
  const label = String(card.variantLabel || "").trim();
  const type = String(card.variantType || "").trim();
  const variantCode = getVariantCode(card.id);

  if (label) {
    const normalized = normalizeText(label);

    if (normalized === "sp gold") return "sp_gold";
    if (normalized === "sp silver") return "sp_silver";
    if (normalized === "red super alternate art") return "red_super_alternate_art";
    if (normalized === "super alternate art") return "super_alternate_art";
    if (normalized === "pirate foil") return "pirate_foil";
    if (normalized === "participation pack") return "participation_pack";
    if (normalized === "finalist") return "finalist";
    if (normalized === "champion") return "champion";

    return slugify(label);
  }

  if (variantCode && /^r\d+$/iu.test(variantCode)) return "reprint";
  if (type === "alt_art") return "alternate_art";
  if (type === "parallel") return "parallel";
  if (type === "sp") return "sp";
  if (type === "manga") return "manga";
  if (type === "manga_red") return "manga_red";
  if (type === "manga_gold") return "manga_gold";
  if (type === "anniversary") return "anniversary";
  if (variantCode && /^p\d+$/iu.test(variantCode)) return "special_print";
  return "variant";
}

function inferQualifier(card) {
  const textSources = [
    card.set,
    ...(Array.isArray(card.cardSetNames) ? card.cardSetNames : []),
    card.releaseCode,
    card.seriesLabel,
    card.originSet,
  ]
    .filter(Boolean)
    .map(String);

  for (const source of textSources) {
    for (const [pattern, replacement] of KNOWN_SET_QUALIFIERS) {
      const match = source.match(pattern);
      if (!match) continue;
      if (typeof replacement === "function") {
        return replacement(...match);
      }
      return replacement;
    }
  }

  if (card.releaseCode) return slugify(card.releaseCode);

  const bracketMatch = /\[([A-Z0-9-]+)\]/iu.exec(String(card.set || ""));
  if (bracketMatch) return slugify(bracketMatch[1]);

  return null;
}

function printSuffix(card) {
  const variantCode = getVariantCode(card.id);
  if (!variantCode) return "variant";

  const numbered = /^([pr])(\d+)$/iu.exec(variantCode);
  if (numbered) return `print_${Number(numbered[2])}`;

  return `print_${slugify(variantCode)}`;
}

const GENERIC_SLUGS = new Set([
  "parallel",
  "alternate_art",
  "sp",
  "manga",
  "manga_red",
  "manga_gold",
  "anniversary",
  "reprint",
  "special_print",
  "variant",
]);

const variantCards = cards.filter((card) => getBaseId(card.id) !== card.id);
const groupsByBase = new Map();

for (const card of variantCards) {
  const baseId = getBaseId(card.id);
  if (!groupsByBase.has(baseId)) groupsByBase.set(baseId, []);
  groupsByBase.get(baseId).push(card);
}

for (const [baseId, group] of groupsByBase.entries()) {
  const tentative = group.map((card) => {
    const semanticSlug = inferSemanticSlug(card);
    const qualifier = inferQualifier(card);
    const needsQualifier = GENERIC_SLUGS.has(semanticSlug);
    const variantSlug = qualifier && needsQualifier ? `${semanticSlug}_${qualifier}` : semanticSlug;
    return { card, baseId, semanticSlug, qualifier, variantSlug };
  });

  const bySlug = new Map();
  for (const item of tentative) {
    if (!bySlug.has(item.variantSlug)) bySlug.set(item.variantSlug, []);
    bySlug.get(item.variantSlug).push(item);
  }

  for (const item of tentative) {
    let variantSlug = item.variantSlug;
    const collisions = bySlug.get(variantSlug) || [];

    if (collisions.length > 1 && item.qualifier && !variantSlug.includes(item.qualifier)) {
      variantSlug = `${variantSlug}_${item.qualifier}`;
    }

    item.variantSlug = variantSlug;
  }

  const finalBySlug = new Map();
  for (const item of tentative) {
    if (!finalBySlug.has(item.variantSlug)) finalBySlug.set(item.variantSlug, []);
    finalBySlug.get(item.variantSlug).push(item);
  }

  for (const item of tentative) {
    let variantSlug = item.variantSlug;
    if ((finalBySlug.get(variantSlug) || []).length > 1) {
      variantSlug = `${variantSlug}_${printSuffix(item.card)}`;
    }

    item.card.variantSlug = item.card.variantSlug || variantSlug;
    item.card.canonicalId = item.card.canonicalId || `${baseId}_${item.card.variantSlug}`;
  }
}

fs.writeFileSync(dataPath, `${JSON.stringify(cards, null, 2)}\n`);

const labeled = variantCards.filter((card) => card.variantSlug && card.canonicalId).length;
const sample = variantCards
  .filter((card) => card.variantSlug && card.canonicalId)
  .slice(0, 12)
  .map((card) => ({
    id: card.id,
    variantLabel: card.variantLabel || null,
    variantSlug: card.variantSlug,
    canonicalId: card.canonicalId,
  }));

console.log(JSON.stringify({
  updatedVariants: labeled,
  totalVariants: variantCards.length,
  sample,
}, null, 2));
