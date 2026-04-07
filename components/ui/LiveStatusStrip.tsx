type LiveStatusStripProps = {
  updatedAt?: string;
  sourceLabel?: string;
  sampleGames?: number;
  sampleText?: string;
  sampleCaption?: string;
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

export default function LiveStatusStrip({
  updatedAt,
  sourceLabel = "Live Aggregate",
  sampleGames,
  sampleText,
  sampleCaption,
  formatLabel = "OP14",
}: LiveStatusStripProps) {
  return (
    <div className="grid gap-2 rounded-[1.4rem] border border-[var(--color-parchment-dark)] bg-[linear-gradient(180deg,rgba(245,239,227,0.98),rgba(250,247,242,0.98))] p-4 text-xs text-[var(--color-text-mid)] shadow-[0_12px_30px_rgba(42,33,24,0.08)] md:grid-cols-4">
      <div>
        <span className="text-[var(--color-text-light)]">Status</span>
        <p className="font-bold text-[var(--color-text-dark)]">
          <span className="text-[var(--color-gold-dark)]">●</span> {sourceLabel}
        </p>
      </div>
      <div>
        <span className="text-[var(--color-text-light)]">Updated</span>
        <p className="font-bold text-[var(--color-text-dark)]">{ago(updatedAt)}</p>
      </div>
      <div>
        <span className="text-[var(--color-text-light)]">Sample</span>
        <p className="font-bold text-[var(--color-text-dark)]">{sampleText || (sampleGames ? `${sampleGames.toLocaleString()} games` : "—")}</p>
        {sampleCaption ? <p className="text-[11px] text-[var(--color-text-light)]">{sampleCaption}</p> : null}
      </div>
      <div>
        <span className="text-[var(--color-text-light)]">Format</span>
        <p className="font-bold text-[var(--color-text-dark)]">{formatLabel}</p>
      </div>
    </div>
  );
}
