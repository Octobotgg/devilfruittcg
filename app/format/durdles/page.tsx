import {
  DURDLE_LEADERS,
  DURDLE_RULES,
  getWantedLeaders,
} from "@/lib/data/formats/durdles-leaders";
import DurdlesGallery from "./DurdlesGallery";

export const revalidate = 86400;

export default function DurdlesPage() {
  const wantedLeaders = getWantedLeaders();

  return (
    <main className="min-h-screen bg-[var(--color-cream)]">
      {/* ── A. Hero ──────────────────────────────────────────────── */}
      <section className="relative manga-bg py-20 px-4 text-center overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto">
          <p
            className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-gold)] mb-3"
            style={{ fontFamily: "var(--font-dm)" }}
          >
            Community Format
          </p>
          <h1 className="text-7xl md:text-8xl text-white manga-impact mb-4">Durdles</h1>
          <p
            className="text-base md:text-lg text-[var(--color-parchment-dark)] max-w-xl mx-auto"
            style={{ fontFamily: "var(--font-crimson)" }}
          >
            A custom One Piece TCG format by Team Durdle. Fan-made leaders, living rules,
            and a rotating meta shaped by tournament results.
          </p>
        </div>
      </section>

      {/* ── B. Format Rules ──────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-4xl text-center mb-10">Format Rules</h2>
        <div
          className="rounded-2xl border-2 border-[rgba(212,160,84,0.4)] bg-[var(--color-parchment)] shadow-md overflow-hidden"
          style={{ backgroundImage: "none" }}
        >
          <div className="divide-y divide-[rgba(212,160,84,0.2)]">
            {DURDLE_RULES.map((rule, i) => (
              <div key={i} className="px-6 py-5 flex gap-4 items-start">
                <span
                  className="shrink-0 w-8 h-8 rounded-full bg-[var(--color-navy)] text-[var(--color-gold)] flex items-center justify-center text-sm font-bold"
                  style={{ fontFamily: "var(--font-dm)" }}
                >
                  {i + 1}
                </span>
                <div>
                  <p
                    className="text-base font-bold text-[var(--color-navy)] mb-1"
                    style={{ fontFamily: "var(--font-pirata)", fontSize: "1.1rem" }}
                  >
                    {rule.title}
                  </p>
                  <p
                    className="text-sm text-[var(--color-text-mid)] leading-relaxed"
                    style={{ fontFamily: "var(--font-crimson)" }}
                  >
                    {rule.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="manga-divider max-w-2xl mx-auto mb-2" />

      {/* ── C. Wanted vs Rogue explainer ─────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 py-10 text-center">
        <p
          className="text-base md:text-lg leading-relaxed text-[var(--color-text-mid)]"
          style={{ fontFamily: "var(--font-crimson)", fontSize: "1.1rem" }}
        >
          Leaders are either{" "}
          <strong className="text-[var(--color-gold)]">Wanted</strong> or{" "}
          <strong className="text-[var(--color-sunset)]">Rogue</strong>.{" "}
          <span className="text-[var(--color-gold)] font-semibold">Wanted</span> leaders are
          the current tournament-featured pool — the ones non-Team-Durdle players must pick
          from.{" "}
          <span className="text-[var(--color-sunset)] font-semibold">Rogue</span> leaders are
          everything else. The roster shifts as the meta evolves: a Wanted leader winning 1st
          place gets banned, and a Rogue leader winning gets promoted to Wanted — plus Team
          Durdle creates a brand-new buffed leader to join the pool.
        </p>
      </section>

      <div className="manga-divider max-w-2xl mx-auto mb-2" />

      {/* ── D + E. Currently Wanted + Full Gallery (client) ──────── */}
      <DurdlesGallery leaders={DURDLE_LEADERS} wantedLeaders={wantedLeaders} />
    </main>
  );
}
