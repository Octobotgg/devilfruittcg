import Image from "next/image";
import Link from "next/link";

export const revalidate = 86400;

export default function FormatIndexPage() {
  return (
    <main className="min-h-screen bg-[var(--color-cream)]">
      {/* Hero */}
      <section className="py-16 px-4 text-center max-w-3xl mx-auto">
        <h1 className="text-5xl md:text-6xl mb-4">Format</h1>
        <p className="text-lg">
          A home for community-made custom formats — fan-created rulesets built by local One
          Piece TCG crews, not official Bandai sets. Each format has its own leaders, rules,
          and living meta.
        </p>
      </section>

      <div className="manga-divider max-w-2xl mx-auto mb-16" />

      {/* Format tiles */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/format/durdles" className="group">
            <div className="manga-panel rounded-2xl overflow-hidden bg-[var(--color-parchment)] transition-transform duration-200 group-hover:-translate-y-1 group-hover:shadow-lg">
              <div className="relative flex w-full aspect-[3/4] items-center justify-center overflow-hidden bg-[linear-gradient(180deg,rgba(247,239,223,0.98),rgba(241,230,207,0.98))] px-8 py-10">
                <div className="absolute inset-6 rounded-[2rem] border border-[rgba(212,160,84,0.22)] bg-[radial-gradient(circle_at_top,rgba(255,247,228,0.94),rgba(245,235,214,0.88)_58%,rgba(234,219,191,0.84))] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_24px_60px_rgba(36,27,19,0.08)]" />
                <div className="absolute inset-x-12 top-10 h-24 rounded-full bg-[radial-gradient(circle,rgba(212,160,84,0.18),transparent_72%)] blur-2xl" />
                <Image
                  src="/format/durdles/durdle-logo.png"
                  alt="Durdle format logo"
                  width={767}
                  height={824}
                  className="relative z-10 h-auto w-[72%] max-w-[320px] object-contain drop-shadow-[0_18px_24px_rgba(36,27,19,0.16)]"
                  sizes="(max-width: 640px) 68vw, (max-width: 1024px) 34vw, 22vw"
                  priority
                />
              </div>
              <div className="p-5">
                <h2 className="text-2xl mb-1">Durdle</h2>
                <p className="text-sm">
                  A custom leader format by Team Durdle. Play with one-of-a-kind fan-made
                  leaders in a rotating Wanted/Rogue meta.
                </p>
                <span className="mt-3 inline-block text-xs font-medium uppercase tracking-wider text-[var(--color-gold)]">
                  View Format →
                </span>
              </div>
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
