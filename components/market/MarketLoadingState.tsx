function LoadingTile({ index }: { index: number }) {
  return (
    <div
      key={`market-loading-tile-${index}`}
      className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(240,192,64,0.10),transparent_42%),rgba(255,255,255,0.03)] p-3"
    >
      <div className="shimmer aspect-[5/7] rounded-[22px]" />
      <div className="mt-3 space-y-2">
        <div className="shimmer h-5 rounded-full" />
        <div className="shimmer h-4 w-1/2 rounded-full" />
        <div className="shimmer h-4 w-2/3 rounded-full" />
        <div className="shimmer h-16 rounded-2xl" />
      </div>
    </div>
  );
}

export default function MarketLoadingState() {
  return (
    <div className="space-y-8 pb-24 md:pb-0">
      <section className="rounded-[32px] border border-[#F0C040]/20 bg-[radial-gradient(circle_at_top_left,rgba(240,192,64,0.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(96,165,250,0.14),transparent_30%),linear-gradient(135deg,rgba(12,19,36,0.96),rgba(8,13,23,0.92))] p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F0C040]/20 bg-[#F0C040]/10 px-3 py-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F0C040]">Market Search</span>
            </div>
            <div className="mt-4 shimmer h-12 w-[28rem] max-w-full rounded-full" />
            <div className="mt-3 shimmer h-6 w-[34rem] max-w-full rounded-full" />
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">Current view</p>
            <p className="mt-1 text-2xl font-black text-white">Loading...</p>
            <p className="mt-1 text-sm text-white/50">Pulling market cards and filters</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <div className="shimmer h-14 flex-1 rounded-[24px]" />
          <div className="shimmer h-14 w-36 rounded-[24px]" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`market-loading-filter-${index}`}
                className="shimmer h-16 rounded-[24px]"
              />
            ))}
          </div>
        </aside>

        <section className="min-w-0 space-y-5">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="shimmer h-5 w-64 rounded-full" />
                <div className="shimmer h-4 w-52 rounded-full" />
              </div>
              <div className="flex gap-2">
                <div className="shimmer h-10 w-28 rounded-xl" />
                <div className="shimmer h-10 w-32 rounded-xl" />
                <div className="shimmer h-10 w-24 rounded-xl" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <LoadingTile key={index} index={index} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
