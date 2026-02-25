const META_DECKS = [
  { rank: 1, name: "Luffy Gear 5 (OP07)", tier: "S", color: "Red", winRate: "58%", popularity: "22%", trend: "▲" },
  { rank: 2, name: "Blackbeard (OP08)", tier: "S", color: "Black/Yellow", winRate: "56%", popularity: "18%", trend: "▲" },
  { rank: 3, name: "Enel (OP05)", tier: "A", color: "Yellow", winRate: "53%", popularity: "14%", trend: "—" },
  { rank: 4, name: "Shanks (OP05)", tier: "A", color: "Red", winRate: "51%", popularity: "12%", trend: "▼" },
  { rank: 5, name: "Kaido (OP04)", tier: "A", color: "Purple", winRate: "50%", popularity: "10%", trend: "—" },
  { rank: 6, name: "Big Mom (OP04)", tier: "B", color: "Black", winRate: "48%", popularity: "9%", trend: "▼" },
  { rank: 7, name: "Law (OP02)", tier: "B", color: "Blue", winRate: "47%", popularity: "8%", trend: "—" },
  { rank: 8, name: "Zoro (OP01)", tier: "C", color: "Green", winRate: "44%", popularity: "7%", trend: "▼" },
];

const tierColors: Record<string, string> = {
  S: "bg-[#f0c040]/20 text-[#f0c040] border-[#f0c040]/30",
  A: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  B: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  C: "bg-white/10 text-white/50 border-white/20",
};

export default function MetaPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">📊 Meta Snapshot</h1>
        <p className="text-white/50">Top decks from recent tournaments — updated weekly</p>
      </div>

      <div className="bg-[#f0c040]/5 border border-[#f0c040]/20 rounded-xl p-4 mb-6 flex items-center gap-3">
        <span className="text-2xl">⚠️</span>
        <p className="text-white/60 text-sm">
          Meta data is currently seeded manually. Live tournament data integration coming soon.
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-semibold text-white">Current Meta Tier List</h3>
          <span className="text-xs text-white/30">As of Feb 2026</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/40">
              <th className="text-left p-4 font-medium">Rank</th>
              <th className="text-left p-4 font-medium">Deck</th>
              <th className="text-left p-4 font-medium">Tier</th>
              <th className="text-left p-4 font-medium hidden md:table-cell">Color</th>
              <th className="text-right p-4 font-medium hidden md:table-cell">Win Rate</th>
              <th className="text-right p-4 font-medium">Popularity</th>
              <th className="text-right p-4 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {META_DECKS.map((deck) => (
              <tr key={deck.rank} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-4 text-white/40 font-mono">#{deck.rank}</td>
                <td className="p-4 text-white font-medium">{deck.name}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${tierColors[deck.tier]}`}>
                    {deck.tier}
                  </span>
                </td>
                <td className="p-4 text-white/50 hidden md:table-cell">{deck.color}</td>
                <td className="p-4 text-right text-white/70 hidden md:table-cell">{deck.winRate}</td>
                <td className="p-4 text-right text-white/70">{deck.popularity}</td>
                <td className={`p-4 text-right font-bold ${deck.trend === "▲" ? "text-green-400" : deck.trend === "▼" ? "text-red-400" : "text-white/30"}`}>
                  {deck.trend}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
