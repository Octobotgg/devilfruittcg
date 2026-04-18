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
      <section className="px-4 py-12 md:py-16">
        <div className="journal-surface treasure-chart-surface relative mx-auto max-w-6xl rounded-[2rem] px-6 py-20 text-center md:px-10 md:py-24">
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(212,160,84,0.28),transparent_68%)]" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-[radial-gradient(circle_at_bottom,rgba(45,106,143,0.12),transparent_72%)]" />
            <div className="speed-lines absolute inset-0 opacity-[0.12] mix-blend-multiply" />
          </div>

          <div className="relative z-10 max-w-3xl mx-auto">
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-gold-dark)]"
            style={{ fontFamily: "var(--font-dm)" }}
          >
            Community Format
          </p>
          <h1
            className="mb-4 text-6xl text-[var(--color-navy)] md:text-8xl"
            style={{
              textShadow: "0 10px 32px rgba(212,160,84,0.28), 2px 2px 0 rgba(42,33,24,0.14)",
            }}
          >
            Durdles
          </h1>
          <div className="mx-auto mb-6 h-px w-32 bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent" />
          <p
            className="mx-auto max-w-2xl text-base text-[var(--color-text-mid)] md:text-lg"
            style={{ fontFamily: "var(--font-crimson)" }}
          >
            A custom One Piece TCG format by Team Durdle. Fan-made leaders, living rules,
            and a rotating meta shaped by tournament results.
          </p>
        </div>
        </div>
      </section>

      {/* ── B. Format Rules ──────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-4xl text-center mb-10">Format Rules</h2>
        <div
          className="rounded-2xl border-2 border-[rgba(212,160,84,0.4)] bg-[var(--color-parchment)] shadow-md overflow-hidden"
          style={{ backgroundImage: "none" }}
        >
          <div className="grid md:grid-cols-2 md:divide-x md:divide-[rgba(212,160,84,0.2)]">
            {DURDLE_RULES.map((rule, i) => (
              <div
                key={i}
                className="flex gap-4 items-start border-b border-[rgba(212,160,84,0.2)] px-6 py-5 md:min-h-[144px] md:border-b-0 [&:nth-last-child(-n+1)]:border-b-0 md:[&:nth-last-child(-n+2)]:border-b-0"
              >
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
