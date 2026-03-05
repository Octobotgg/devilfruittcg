"use client";

import { useEffect, useState } from "react";
import DashboardCard from "@/components/ui/DashboardCard";
import DonButton from "@/components/ui/DonButton";
import GlowTag from "@/components/ui/GlowTag";
import TickerRow from "@/components/ui/TickerRow";
import { LEADER_THEME_MAP, setThemeByLeaderColor, type LeaderColor } from "@/lib/theme/leader-theme";

const LEADER_DEMO: Array<{ color: LeaderColor; leader: string; winrate: string; cardId: string }> = [
  { color: "red", leader: "Zoro", winrate: "54.2%", cardId: "OP01-001" },
  { color: "yellow", leader: "Enel", winrate: "52.7%", cardId: "OP05-098" },
  { color: "black", leader: "Lucci", winrate: "51.4%", cardId: "OP07-079" },
];

export default function ThemeLabPage() {
  const [active, setActive] = useState<LeaderColor>("red");

  useEffect(() => {
    setThemeByLeaderColor(active);
  }, [active]);

  return (
    <div className="space-y-4">
      <div className="panel-surface rounded-2xl p-4 md:p-5">
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--theme-accent-2)]">Visual System Demo</p>
        <h1 className="mt-1 text-3xl font-black">Leader Aura Theme Switch</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Switch leader color below. All surfaces, tags, glows and accents update through CSS variables only.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(LEADER_THEME_MAP) as LeaderColor[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActive(c)}
              className={`rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] transition ${
                active === c ? "text-white" : "text-white/70"
              }`}
              style={{
                borderColor: active === c ? "var(--theme-accent)" : "var(--panel-border)",
                background: active === c ? "color-mix(in oklab, var(--theme-accent) 35%, #000)" : "rgba(255,255,255,0.03)",
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <TickerRow
        items={[
          { label: "OP01-120", value: "$1,429", delta: 5.2 },
          { label: "OP09-118", value: "$899", delta: -1.7 },
          { label: "Manga Ace", value: "$2,750", delta: 3.1 },
          { label: "SP Nami", value: "$620", delta: 2.3 },
        ]}
      />

      <section className="bento-grid">
        <DashboardCard title="The Yonko" subtitle="Top meta decks this week" className="col-span-12 md:col-span-8">
          <div className="flex flex-wrap gap-4">
            {LEADER_DEMO.map((d) => (
              <div key={d.leader} className="relative w-28">
                <img
                  src={`/api/card-image?id=${d.cardId}&variant=p1`}
                  alt={d.leader}
                  className="h-40 w-28 rounded-xl border border-white/20 object-cover"
                />
                <p className="mt-2 text-sm font-bold">{d.leader}</p>
                <p className="text-xs text-[var(--theme-accent-2)]">{d.winrate}</p>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Bounty Movers" subtitle="24h market spikes" className="col-span-12 md:col-span-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>OP01-120</span><span className="text-[var(--success)]">+6.2%</span></div>
            <div className="flex justify-between"><span>OP09-118</span><span className="text-[var(--success)]">+3.4%</span></div>
            <div className="flex justify-between"><span>EB03-052</span><span className="text-[var(--danger)]">-1.2%</span></div>
          </div>
        </DashboardCard>

        <DashboardCard title="Tournament Radar" subtitle="Next major events" className="col-span-12 md:col-span-4">
          <ul className="space-y-2 text-sm text-[var(--text-muted)]">
            <li>Treasure Cup · 03/14 · NY</li>
            <li>Regionals · 03/28 · Dallas</li>
            <li>Store Finals · 04/05 · Online</li>
          </ul>
        </DashboardCard>

        <DashboardCard title="Primitives" subtitle="Reusable controls" className="col-span-12 md:col-span-8">
          <div className="flex flex-wrap items-center gap-3">
            <GlowTag>Meta Live</GlowTag>
            <GlowTag>Dual Color Ready</GlowTag>
            <DonButton href="/matchups">Compare Leaders</DonButton>
            <DonButton href="/deckbuilder">Build Deck</DonButton>
          </div>
        </DashboardCard>
      </section>
    </div>
  );
}
