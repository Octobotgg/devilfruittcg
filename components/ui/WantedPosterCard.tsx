import Link from "next/link";
import TiltCard from "@/components/ui/TiltCard";

type WantedPosterCardProps = {
  id: string;
  name: string;
  subtitle?: string;
  href: string;
  variant?: string;
  rotateDeg?: number;
};

export default function WantedPosterCard({ id, name, subtitle, href, variant = "p1", rotateDeg = 0 }: WantedPosterCardProps) {
  return (
    <Link href={href} className="group block wanted-poster rounded-2xl p-3" style={{ transform: `rotate(${rotateDeg}deg)` }}>
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#5d4325]">Wanted</p>
      <TiltCard className="mt-1 overflow-hidden rounded-lg border border-[#8f6a3b]/40 bg-[#ecd3a4]/25">
        <img
          src={`/api/card-image?id=${id}&variant=${variant}`}
          alt={name}
          className="aspect-[5/7] w-full object-contain p-1 transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </TiltCard>
      <p className="mt-2 truncate text-sm font-black text-[#2e2011]">{name}</p>
      <p className="text-[11px] text-[#5d4325]">{subtitle || id}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#7a250d]">Bounty Target</p>
    </Link>
  );
}
