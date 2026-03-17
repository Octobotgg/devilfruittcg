import BrandMark from "@/components/BrandMark";

const sections = [
  {
    title: "What We Collect",
    body:
      "When you create an account, we may store your email address, profile metadata such as your full name, and account-linked data like decks, collections, and watchlists.",
  },
  {
    title: "How We Use It",
    body:
      "We use account data to authenticate you, sync saved features across sessions, and improve the DevilFruitTCG experience. We do not need your private collection data to be public in order to provide the service.",
  },
  {
    title: "Third-Party Services",
    body:
      "DevilFruitTCG relies on hosted infrastructure and authentication providers, including Vercel and Supabase. Social sign-in flows may involve Google when you choose that option.",
  },
  {
    title: "Security",
    body:
      "We use standard platform security controls for authentication and account storage. No internet service is risk-free, so users should still use strong passwords and protect their email accounts.",
  },
  {
    title: "Your Choices",
    body:
      "You can choose whether to use Google, password login, or magic link login. You can also sign out and stop using account-backed features at any time.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <section className="journal-surface treasure-chart-surface rounded-[2rem] p-6 md:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,175,55,0.28)] bg-[rgba(10,10,10,0.56)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-accent-2)]">
          Privacy Policy
        </div>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <BrandMark className="brand-lockup-large" subtitle="DEVILFRUITTCG PRIVACY" />
          <div className="brand-proof-chip">
            <span className="brand-proof-label">Last updated</span>
            <span className="brand-proof-value">March 7, 2026</span>
          </div>
        </div>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-white/70">
          <p>
            This policy describes the main categories of data used to operate DevilFruitTCG and how that data supports account access, syncing, and site functionality.
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
