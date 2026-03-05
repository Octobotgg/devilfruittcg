type TickerItem = {
  label: string;
  value: string;
  delta: number;
};

type TickerRowProps = {
  items: TickerItem[];
  className?: string;
};

export default function TickerRow({ items, className = "" }: TickerRowProps) {
  const loop = [...items, ...items];

  return (
    <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-black/25 ${className}`}>
      <div className="ticker-track flex min-w-max items-center gap-5 py-2">
        {loop.map((item, idx) => {
          const up = item.delta >= 0;
          return (
            <div key={`${item.label}-${idx}`} className="flex items-center gap-2 whitespace-nowrap text-xs">
              <span className="font-bold text-white/85">{item.label}</span>
              <span className="text-white/70">{item.value}</span>
              <span className={up ? "font-bold text-[var(--success)]" : "font-bold text-[var(--danger)]"}>
                {up ? "▲" : "▼"} {Math.abs(item.delta).toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
      <style jsx>{`
        .ticker-track {
          animation: ticker 28s linear infinite;
        }
        @keyframes ticker {
          from {
            transform: translateX(0%);
          }
          to {
            transform: translateX(-50%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-track {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
