const META_DECKS = [
  { rank: 1, name: "Luffy Gear 5 (OP07)", tier: "S", color: "Red", winRate: 58, popularity: 22, trend: "▲" },
  { rank: 2, name: "Blackbeard (OP08)", tier: "S", color: "Black/Yellow", winRate: 56, popularity: 18, trend: "▲" },
  { rank: 3, name: "Enel (OP05)", tier: "A", color: "Yellow", winRate: 53, popularity: 14, trend: "—" },
  { rank: 4, name: "Shanks (OP05)", tier: "A", color: "Red", winRate: 51, popularity: 12, trend: "▼" },
  { rank: 5, name: "Kaido (OP04)", tier: "A", color: "Purple", winRate: 50, popularity: 10, trend: "—" },
  { rank: 6, name: "Big Mom (OP04)", tier: "B", color: "Black", winRate: 48, popularity: 9, trend: "▼" },
  { rank: 7, name: "Law (OP02)", tier: "B", color: "Blue", winRate: 47, popularity: 8, trend: "—" },
  { rank: 8, name: "Zoro (OP01)", tier: "C", color: "Green", winRate: 44, popularity: 7, trend: "▼" },
];

const REGION_SPLIT = [
  { region: "NA", events: 12, players: 880 },
  { region: "EU", events: 10, players: 760 },
  { region: "APAC", events: 8, players: 620 },
];

const tierColors: Record<string, string> = {
  S: "bg-[#f0c040]/20 text-[#f0c040] border-[#f0c040]/30",
  A: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  B: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  C: "bg-white/10 text-white/50 border-white/20",
};

const trendColor = (t: string) => (t === "▲" ? "text-green-400" : t === "▼" ? "text-red-400" : "text-white/30");

function barColor(win: number) {
  if (win >= 56) return "bg-green-400";
  if (win >= 52) return "bg-blue-400";
  if (win >= 48) return "bg-orange-400";
  return "bg-red-400";
}

export default function MetaPage() {
  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-white mb-2">📊 Meta Snapshot</h1>
        <p className="text-white/50">Tournament + OPTCG Sim snapshot (seeded). Live data pipeline coming next.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-white/50 text-xs uppercase">Top deck</p>
          <p className="text-white text-lg font-semibold mt-1">Luffy Gear 5</p>
          <p className="text-white/40 text-sm">58% win · 22% field · trending up</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-white/50 text-xs uppercase">Rising deck</p>
          <p className="text-white text-lg font-semibold mt-1">Blackbeard</p>
          <p className="text-white/40 text-sm">+2 pts week-over-week · control wipe</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-white/50 text-xs uppercase">Falling deck</p>
          <p className="text-white text-lg font-semibold mt-1">Shanks</p>
          <p className="text-white/40 text-sm">-1.5 pts week-over-week · tempo losing ground</p>
        </div>
      </div>

      <div className="bg-[#f0c040]/5 border border-[#f0c040]/20 rounded-xl p-4 flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <p className="text-white/60 text-sm">
          Meta data is currently seeded manually. Next step: pipe in real tournaments and OPTCG Sim logs with nightly refresh.
        </p>
      </div>

      {/* Meta Tier Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-semibold text-white">Current Meta Tier List</h3>
          <span className="text-xs text-white/30">As of Feb 2026 (seeded)</span>
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
                <td className="p-4 text-right text-white/70 hidden md:table-cell">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-20 bg-white/10 h-2 rounded-full">
                      <div className={`h-2 rounded-full ${barColor(deck.winRate)}`} style={{ width: `${deck.winRate}%` }} />
                    </div>
                    <span className="font-bold text-sm text-white/80">{deck.winRate}%</span>
                  </div>
                </td>
                <td className="p-4 text-right text-white/70">{deck.popularity}%</td>
                <td className={`p-4 text-right font-bold ${trendColor(deck.trend)}`}>
                  {deck.trend}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Region split & methodology */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h4 className="text-white font-semibold mb-2">Region split</h4>
          <div className="space-y-2 text-sm text-white/70">
            {REGION_SPLIT.map((r) => (
              <div key={r.region} className="flex items-center justify-between gap-3">
                <span className="text-white/80">{r.region}</span>
                <div className="flex-1 mx-2 bg-white/10 h-2 rounded-full">
                  <div className="bg-[#f0c040] h-2 rounded-full" style={{ width: `${Math.min(100, (r.players / 900) * 100)}%` }} />
                </div>
                <span className="text-white/50 text-xs">{r.events} events · {r.players} players</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h4 className="text-white font-semibold mb-2">Data source plan</h4>
          <ul className="text-white/60 text-sm space-y-1 list-disc list-inside">
            <li>OPTCG Sim logs → matchup win rates</li>
            <li>Tournament results (Limitless / community)</li>
            <li>Nightly aggregation + outlier trim</li>
          </ul>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h4 className="text-white font-semibold mb-2">Next steps</h4>
          <ul className="text-white/60 text-sm space-y-1 list-disc list-inside">
            <li>Wire live data feed + cron refresh</li>
            <li>Expose API: /api/meta for frontends</li>
            <li>Per-region filters + weekly deltas</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
