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
              <div className="relative w-full aspect-[3/4] bg-[var(--color-navy)]">
                <Image
                  src="/format/durdles/gamer-durdle.png"
                  alt="Gamer Durdle — Durdles Format"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  priority
                />
              </div>
              <div className="p-5">
                <h2 className="text-2xl mb-1">Durdles</h2>
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
