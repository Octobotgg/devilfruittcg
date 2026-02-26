import Link from "next/link";

const concepts = [
  { id: "Coin Mark", file: "/images/logo-concept-coin.svg", notes: "Best for favicon/app icon + clean brand recall." },
  { id: "Royal Crest", file: "/images/logo-concept-crest.svg", notes: "Premium shield style, strongest for hero branding." },
  { id: "Neo Arena", file: "/images/logo-concept-esports.svg", notes: "Aggressive competitive look for matchup/meta identity." },
];

export default function LogoLabPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black text-white">DevilFruitTCG Logo Lab</h1>
        <p className="text-white/50 mt-2">Live preview concepts. Pick one direction and I’ll finalize it into full brand assets.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {concepts.map((concept) => (
          <div key={concept.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <div className="rounded-2xl bg-[#0b1224] border border-white/10 p-4">
              <img src={concept.file} alt={concept.id} className="w-full h-auto rounded-xl" />
            </div>
            <h2 className="text-xl text-white font-bold mt-4">{concept.id}</h2>
            <p className="text-white/50 text-sm mt-2">{concept.notes}</p>
          </div>
        ))}
      </div>

      <div className="pt-2">
        <Link href="/" className="text-[#F0C040] font-semibold hover:underline">← Back to site</Link>
      </div>
    </div>
  );
}
