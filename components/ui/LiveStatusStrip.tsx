type LiveStatusStripProps = {
  updatedAt?: string;
  sourceLabel?: string;
  sampleGames?: number;
  formatLabel?: string;
};

function ago(iso?: string) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.max(1, Math.floor(diff / 60000));
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function LiveStatusStrip({ updatedAt, sourceLabel = "Live Aggregate", sampleGames, formatLabel = "OP14" }: LiveStatusStripProps) {
  return (
    <div className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/75 md:grid-cols-4">
      <div><span className="text-white/45">Status</span><p className="font-bold text-[var(--theme-accent-2)]">● {sourceLabel}</p></div>
      <div><span className="text-white/45">Updated</span><p className="font-bold">{ago(updatedAt)}</p></div>
      <div><span className="text-white/45">Sample</span><p className="font-bold">{sampleGames ? sampleGames.toLocaleString() : "—"} games</p></div>
      <div><span className="text-white/45">Format</span><p className="font-bold">{formatLabel}</p></div>
    </div>
  );
}
