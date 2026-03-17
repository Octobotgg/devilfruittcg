import { deckColorPillStyle } from "@/lib/theme/color-utils";

type LeaderColorTagProps = {
  colorLabel?: string;
  className?: string;
};

export default function LeaderColorTag({ colorLabel, className = "" }: LeaderColorTagProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.09em] ${className}`}
      style={deckColorPillStyle(colorLabel)}
    >
      {colorLabel || "Unknown"}
    </span>
  );
}
