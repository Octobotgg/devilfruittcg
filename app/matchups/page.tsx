export default function MatchupsPage() {
  const decks = [
    "Luffy (Red)", "Zoro (Green)", "Law (Blue)", "Kaido (Purple)",
    "Big Mom (Black)", "Enel (Yellow)", "Shanks (Red)", "Blackbeard (Black/Yellow)",
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">⚔️ Matchup Matrix</h1>
        <p className="text-white/50">Win rates by deck matchup — powered by OPTCG Sim logs</p>
      </div>

      <div className="bg-[#f0c040]/5 border border-[#f0c040]/20 rounded-2xl p-8 text-center mb-8">
        <div className="text-4xl mb-4">🚧</div>
        <h2 className="text-xl font-semibold text-white mb-2">Coming Soon</h2>
        <p className="text-white/50 max-w-md mx-auto">
          We&apos;re pulling win/loss data from OPTCG Sim replays to build a real matchup matrix. 
          This will show actual win percentages for every deck vs. deck combination.
        </p>
      </div>

      {/* Preview of what it'll look like */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden opacity-40 pointer-events-none select-none">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-white">Matchup Matrix Preview</h3>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="text-xs w-full">
            <thead>
              <tr>
                <th className="p-2 text-left text-white/40 min-w-[120px]">vs.</th>
                {decks.map((d) => (
                  <th key={d} className="p-2 text-white/40 min-w-[80px] text-center">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {decks.map((deck) => (
                <tr key={deck} className="border-t border-white/5">
                  <td className="p-2 text-white/60 font-medium">{deck}</td>
                  {decks.map((_, i) => {
                    const val = deck === decks[i] ? null : Math.floor(40 + Math.random() * 20);
                    return (
                      <td key={i} className="p-2 text-center">
                        {val === null ? (
                          <span className="text-white/20">—</span>
                        ) : (
                          <span className={val >= 50 ? "text-green-400" : "text-red-400"}>
                            {val}%
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
