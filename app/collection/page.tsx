"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Minus, Trash2, TrendingUp, Package, DollarSign, RefreshCw } from "lucide-react";
import { SEED_CARDS, searchCards, type Card } from "@/lib/cards";

interface CollectionEntry {
  cardId: string;
  quantity: number;
  price?: number;
  lastUpdated?: string;
}

interface Collection {
  [cardId: string]: CollectionEntry;
}

const STORAGE_KEY = "devilfruit_collection";

function loadCollection(): Collection {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCollection(c: Collection) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

export default function CollectionPage() {
  const [collection, setCollection] = useState<Collection>({});
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Card[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [activeTab, setActiveTab] = useState<"collection" | "add">("collection");

  // Load collection from localStorage
  useEffect(() => {
    setCollection(loadCollection());
  }, []);

  // Search cards
  useEffect(() => {
    if (!query.trim()) {
      setResults(SEED_CARDS.slice(0, 12));
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      setResults(searchCards(query));
      setSearching(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  function addCard(card: Card) {
    const updated = { ...collection };
    if (updated[card.id]) {
      updated[card.id].quantity += 1;
    } else {
      updated[card.id] = { cardId: card.id, quantity: 1 };
    }
    setCollection(updated);
    saveCollection(updated);
  }

  function removeCard(cardId: string, delta: number) {
    const updated = { ...collection };
    if (!updated[cardId]) return;
    updated[cardId].quantity += delta;
    if (updated[cardId].quantity <= 0) {
      delete updated[cardId];
    }
    setCollection(updated);
    saveCollection(updated);
  }

  function deleteCard(cardId: string) {
    const updated = { ...collection };
    delete updated[cardId];
    setCollection(updated);
    saveCollection(updated);
  }

  const refreshPrices = useCallback(async () => {
    const entries = Object.values(collection);
    if (!entries.length) return;
    setLoadingPrices(true);
    const updated = { ...collection };
    await Promise.all(
      entries.slice(0, 5).map(async (entry) => {
        try {
          const res = await fetch(`/api/market?id=${entry.cardId}`);
          if (res.ok) {
            const data = await res.json();
            updated[entry.cardId].price = data.ebay?.averagePrice || 0;
            updated[entry.cardId].lastUpdated = new Date().toISOString();
          }
        } catch {
          // non-fatal
        }
      })
    );
    setCollection(updated);
    saveCollection(updated);
    setLoadingPrices(false);
  }, [collection]);

  const collectionEntries = Object.values(collection);
  const totalCards = collectionEntries.reduce((a, b) => a + b.quantity, 0);
  const totalValue = collectionEntries.reduce((sum, entry) => {
    return sum + (entry.price || 0) * entry.quantity;
  }, 0);
  const uniqueCards = collectionEntries.length;

  const getCard = (id: string) => SEED_CARDS.find((c) => c.id === id);

  const rarityColor: Record<string, string> = {
    L: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    SR: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    R: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    UC: "text-green-400 bg-green-400/10 border-green-400/20",
    C: "text-white/40 bg-white/5 border-white/10",
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">📦 Collection Tracker</h1>
        <p className="text-white/50">Track your cards, see live value, know what to sell or hold.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Package className="w-5 h-5 text-[#f0c040] mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{totalCards}</div>
          <div className="text-xs text-white/40 mt-1">Total Cards</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <DollarSign className="w-5 h-5 text-green-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">
            {totalValue > 0 ? `$${totalValue.toFixed(2)}` : "—"}
          </div>
          <div className="text-xs text-white/40 mt-1">Est. Value</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <TrendingUp className="w-5 h-5 text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{uniqueCards}</div>
          <div className="text-xs text-white/40 mt-1">Unique Cards</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("collection")}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === "collection"
              ? "bg-[#f0c040] text-black"
              : "bg-white/5 text-white/60 hover:text-white border border-white/10"
          }`}
        >
          My Collection ({uniqueCards})
        </button>
        <button
          onClick={() => setActiveTab("add")}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === "add"
              ? "bg-[#f0c040] text-black"
              : "bg-white/5 text-white/60 hover:text-white border border-white/10"
          }`}
        >
          + Add Cards
        </button>
        {uniqueCards > 0 && (
          <button
            onClick={refreshPrices}
            disabled={loadingPrices}
            className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loadingPrices ? "animate-spin" : ""}`} />
            {loadingPrices ? "Updating..." : "Refresh Prices"}
          </button>
        )}
      </div>

      {/* My Collection Tab */}
      {activeTab === "collection" && (
        <div>
          {collectionEntries.length === 0 ? (
            <div className="text-center py-16 bg-white/3 border border-white/10 border-dashed rounded-2xl">
              <div className="text-5xl mb-4">📦</div>
              <p className="text-white/40 mb-3">Your collection is empty</p>
              <button
                onClick={() => setActiveTab("add")}
                className="text-[#f0c040] text-sm hover:underline"
              >
                Add your first card →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {collectionEntries.map((entry) => {
                const card = getCard(entry.cardId);
                if (!card) return null;
                const entryValue = (entry.price || 0) * entry.quantity;
                return (
                  <div
                    key={entry.cardId}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4 hover:border-white/20 transition-all"
                  >
                    {/* Card Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={`/api/card-image?id=${card.id}`}
                        alt={card.name}
                        className="w-12 h-16 object-cover rounded-lg border border-white/10"
                      />
                    </div>

                    {/* Card Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-medium truncate">{card.name}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded border font-bold ${rarityColor[card.rarity] || rarityColor.C}`}>
                          {card.rarity}
                        </span>
                      </div>
                      <p className="text-xs text-white/40">{card.id} · {card.set}</p>
                      {entry.price ? (
                        <p className="text-xs text-green-400 mt-1">
                          ${entry.price.toFixed(2)} ea · Total: ${entryValue.toFixed(2)}
                        </p>
                      ) : (
                        <p className="text-xs text-white/20 mt-1">Price not loaded</p>
                      )}
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => removeCard(entry.cardId, -1)}
                        className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-white font-bold">{entry.quantity}</span>
                      <button
                        onClick={() => addCard(card)}
                        className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteCard(entry.cardId)}
                        className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-500/20 transition-all ml-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Total Row */}
              {totalValue > 0 && (
                <div className="bg-[#f0c040]/5 border border-[#f0c040]/20 rounded-xl p-4 flex items-center justify-between mt-2">
                  <span className="text-white/60 font-medium">Collection Value</span>
                  <span className="text-2xl font-bold text-[#f0c040]">${totalValue.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Cards Tab */}
      {activeTab === "add" && (
        <div>
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, set, or card ID..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#f0c040]/50 transition-all"
            />
            {searching && (
              <RefreshCw className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 animate-spin" />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {results.map((card) => {
              const inCollection = collection[card.id];
              return (
                <div
                  key={card.id}
                  className={`bg-white/5 border rounded-xl p-4 flex items-center gap-3 transition-all ${
                    inCollection ? "border-[#f0c040]/30 bg-[#f0c040]/5" : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <img
                    src={`/api/card-image?id=${card.id}`}
                    alt={card.name}
                    className="w-10 h-14 object-cover rounded-lg border border-white/10 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{card.name}</p>
                    <p className="text-white/40 text-xs">{card.id}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-bold ${rarityColor[card.rarity] || rarityColor.C}`}>
                        {card.rarity}
                      </span>
                      <span className="text-xs text-white/30">{card.color}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    {inCollection && (
                      <span className="text-xs text-[#f0c040] font-bold">×{inCollection.quantity}</span>
                    )}
                    <button
                      onClick={() => addCard(card)}
                      className="w-8 h-8 rounded-lg bg-[#f0c040]/10 border border-[#f0c040]/20 flex items-center justify-center text-[#f0c040] hover:bg-[#f0c040]/20 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {results.length === 0 && !searching && (
            <div className="text-center py-10 text-white/30">
              No cards found for &quot;{query}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
