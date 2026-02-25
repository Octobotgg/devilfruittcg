export default function CollectionPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">📦 Collection Tracker</h1>
        <p className="text-white/50">Track what you own. See your collection value live.</p>
      </div>

      <div className="bg-[#f0c040]/5 border border-[#f0c040]/20 rounded-2xl p-12 text-center">
        <div className="text-5xl mb-4">🍇</div>
        <h2 className="text-xl font-semibold text-white mb-2">Coming Soon</h2>
        <p className="text-white/50 max-w-md mx-auto mb-6">
          Add cards to your collection, track total value in real time, get alerts when your 
          cards spike or dip, and know exactly what to sell or hold.
        </p>
        <div className="inline-flex flex-col gap-2 text-left text-sm text-white/40 bg-white/5 rounded-xl p-4 max-w-xs">
          <p>✦ Track cards you own</p>
          <p>✦ See total collection value</p>
          <p>✦ Price alerts when cards move</p>
          <p>✦ "Sell now" signals</p>
        </div>
      </div>
    </div>
  );
}
