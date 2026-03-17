import BrandMark from "@/components/BrandMark";

const sections = [
  {
    title: "Using DevilFruitTCG",
    body:
      "You may browse public pages freely. Account features are for personal use, lawful use, and normal gameplay, collection, and market tracking workflows.",
  },
  {
    title: "Accounts",
    body:
      "You are responsible for maintaining access to your account and for the accuracy of the information you choose to save, including decks, collections, watchlists, and profile details.",
  },
  {
    title: "Content And Data",
    body:
      "Market, deck, and card information is provided for informational use. We work to keep data current, but availability, pricing, and meta information can change without notice.",
  },
  {
    title: "Platform Rules",
    body:
      "Do not abuse the service, attempt to interfere with the platform, bypass access controls, scrape protected routes, or use the site in a way that harms other users or the infrastructure.",
  },
  {
    title: "Changes",
    body:
      "These terms can change as the product evolves. Continued use of DevilFruitTCG after an update means you accept the revised terms.",
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <section className="journal-surface treasure-chart-surface rounded-[2rem] p-6 md:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,175,55,0.28)] bg-[rgba(10,10,10,0.56)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-accent-2)]">
          Terms of Service
        </div>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <BrandMark className="brand-lockup-large" subtitle="DEVILFRUITTCG TERMS" />
          <div className="brand-proof-chip">
            <span className="brand-proof-label">Last updated</span>
            <span className="brand-proof-value">March 7, 2026</span>
          </div>
        </div>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-white/70">
          <p>
            These terms govern use of DevilFruitTCG, including public pages, account features, saved data, and any future premium tools connected to the platform.
          </p>
          <div className="grid gap-4">
            {sections.map((section) => (
              <div key={section.title} className="captains-bento-card rounded-[1.35rem] p-5">
                <h2 className="text-lg font-black text-white">{section.title}</h2>
                <p className="mt-2">{section.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
