import type { ReactNode } from "react";

type GlowTagProps = {
  children: ReactNode;
  className?: string;
};

export default function GlowTag({ children, className = "" }: GlowTagProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.09em] ${className}`}
      style={{
        borderColor: "color-mix(in oklab, var(--theme-accent) 55%, transparent)",
        background: "color-mix(in oklab, var(--theme-accent) 20%, transparent)",
        color: "var(--theme-accent-2)",
        boxShadow: "0 0 12px color-mix(in oklab, var(--theme-glow) 45%, transparent)",
      }}
    >
      {children}
    </span>
  );
}
