"use client";

import Link from "next/link";

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

const FEATURES = [
  {
    emoji: "\u{1F4C8}",
    title: "Live Market Pricing",
    desc: "Real-time prices from eBay and TCGPlayer so you know what your cards are actually worth.",
  },
  {
    emoji: "\u2694\uFE0F",
    title: "Matchup Matrix",
    desc: "Head-to-head win rates across 369K+ simulated games. Know your good and bad matchups.",
  },
  {
    emoji: "\u{1F9ED}",
    title: "Weekly Meta Reports",
    desc: "Tournament data broken down by leader, color, and tier every week.",
  },
  {
    emoji: "\u{1F5C2}\uFE0F",
    title: "Collection Tracker",
    desc: "Log every card you own, track set completion, and see what your collection is worth.",
  },
  {
    emoji: "\u{1F527}",
    title: "Visual Deck Builder",
    desc: "Build, test, and share decks with drag-and-drop and real-time legality checks.",
  },
  {
    emoji: "\u{1F3F4}\u200D\u2620\uFE0F",
    title: "One Piece to the Core",
    desc: "Not a generic TCG shell. Every feature is built for this game and this community.",
  },
];

export default function AboutPageClient() {
  return (
    <>
      {/* ── HERO ──────────────────────────────────── */}
      <section className="about-full-bleed about-hero about-fade-up">
        <div className="about-hero-badge">The Whole Story</div>
        <h1>
          About <span className="gold">Devil Fruit TCG</span>
        </h1>
        <p className="about-hero-sub">
          A One Piece TCG home base built by a player who got tired of bouncing
          between five tabs just to prep for locals. This is the site I wanted to
          exist.
        </p>

        <div className="about-wave">
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none">
            <path
              d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,30 1440,40 L1440,60 L0,60 Z"
              fill="var(--cream)"
            />
          </svg>
        </div>
      </section>

      {/* ── ORIGIN STORY ──────────────────────────── */}
      <section className="about-full-bleed about-body">
        <div className="about-origin">
          <div className="about-origin-image-wrap">
            <div className="about-origin-image">
              <img
                src="/api/card-image?id=OP01-001&variant=p1"
                alt="One Piece TCG leader card"
              />
            </div>
          </div>

          <div>
            <span className="about-tag">The Origin Story</span>
            <h2 className="about-heading">Home Port for One Piece TCG</h2>

            <p className="about-text">
              Devil Fruit TCG started because I wanted one place to check card
              prices, look at matchup data, and build decks without jumping
              between five different sites that all felt like they were built for
              a different card game.
            </p>
            <p className="about-text">
              I&apos;m a player first. I go to locals, I open packs, I get tilted
              when my Enel list bricks. This site is built from that energy
              &mdash; not from a product roadmap in some startup&apos;s Notion doc.
            </p>

            <div className="about-info-box">
              <div className="about-info-row">
                <span className="about-info-label">Market Pricing</span>
                <span className="about-info-value">Live sync</span>
              </div>
              <div className="about-info-row">
                <span className="about-info-label">Matchup Matrix</span>
                <span className="about-info-value">369K+ games</span>
              </div>
              <div className="about-info-row">
                <span className="about-info-label">Meta Reports</span>
                <span className="about-info-value">Weekly refresh</span>
              </div>
              <div className="about-info-row">
                <span className="about-info-label">Deck Builder</span>
                <span className="about-info-value">Visual + fast</span>
              </div>
            </div>

            <div className="about-socials">
              <a
                href="https://discord.gg/clawd"
                target="_blank"
                rel="noopener noreferrer"
                className="about-social-icon"
                aria-label="Discord"
              >
                <DiscordIcon />
              </a>
              <a
                href="#"
                className="about-social-icon"
                aria-label="X / Twitter"
              >
                <XIcon />
              </a>
              <a
                href="#"
                className="about-social-icon"
                aria-label="YouTube"
              >
                <YouTubeIcon />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── BANNER ────────────────────────────────── */}
      <section className="about-full-bleed about-banner-bg">
        <div className="about-banner">
          <div>
            <span className="about-tag">Why This Exists</span>
            <h2 className="about-heading">
              Built at Locals, Not in a Board Room
            </h2>

            <p className="about-text">
              Every feature on this site came from a real moment at the table.
              The matchup matrix started because I kept losing to the same leader
              and wanted to know if it was me or the matchup. The market tracker
              started because I pulled a card and couldn&apos;t find a reliable
              price in under 30 seconds.
            </p>
            <p className="about-text">
              This isn&apos;t a company. It&apos;s one player building the
              toolkit they wished existed &mdash; and sharing it with the crew.
            </p>

            <Link href="/market" className="about-cta">
              Explore the Site <ArrowRightIcon />
            </Link>
          </div>

          <div className="about-banner-image">
            <img
              src="/api/card-image?id=OP11-041&variant=p1"
              alt="One Piece TCG card"
            />
          </div>

          <div className="about-banner-dot" />
        </div>
      </section>

      {/* ── FEATURES GRID ─────────────────────────── */}
      <section className="about-full-bleed about-body">
        <div className="about-features">
          <div className="about-features-header">
            <span className="about-tag">The Toolkit</span>
            <h2 className="about-heading">What You Get on Board</h2>
            <p className="about-text">
              Every tool is designed for One Piece TCG players. No generic card
              game filler.
            </p>
          </div>

          <div className="about-features-grid">
            <div className="about-features-col">
              {FEATURES.slice(0, 3).map((f) => (
                <div key={f.title} className="about-feature-card">
                  <div className="about-feature-emoji">{f.emoji}</div>
                  <div className="about-feature-title">{f.title}</div>
                  <div className="about-feature-desc">{f.desc}</div>
                </div>
              ))}
            </div>

            <div className="about-features-center-card">
              <img
                src="/api/card-image?id=OP11-041&variant=p1"
                alt="Featured One Piece TCG card"
              />
            </div>

            <div className="about-features-col">
              {FEATURES.slice(3, 6).map((f) => (
                <div key={f.title} className="about-feature-card">
                  <div className="about-feature-emoji">{f.emoji}</div>
                  <div className="about-feature-title">{f.title}</div>
                  <div className="about-feature-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PERSONAL NOTE ─────────────────────────── */}
      <section className="about-full-bleed about-note">
        <div className="about-note-inner">
          <span className="about-tag">A Note from the Captain</span>
          <h2 className="about-heading">Thanks for Being Part of the Crew</h2>

          <p className="about-text">
            I built Devil Fruit TCG because I love this game and I wanted
            something that felt like it was made for us &mdash; One Piece players
            &mdash; not just another tool with a pirate hat slapped on it.
          </p>
          <p className="about-text">
            The site is free. The data is open. If it helps you prep for a
            tournament, find a fair price on a card, or just enjoy the game more,
            then it&apos;s doing its job.
          </p>
          <p className="about-text">
            If you&apos;ve got ideas, feedback, or just want to talk One Piece
            TCG &mdash; come find me on Discord. The door&apos;s always open.
          </p>

          <div className="about-signature">&mdash; Javier</div>
          <div className="about-signature-sub">
            Player &middot; Builder &middot; Devil Fruit TCG
          </div>
        </div>
      </section>
    </>
  );
}
