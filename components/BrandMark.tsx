import Image from "next/image";

type BrandMarkProps = {
  variant?: "lockup" | "monogram";
  className?: string;
  subtitle?: string;
  compact?: boolean;
};

const BRAND_EMBLEM_SRC = "/images/logo-refresh/devilfruit-emblem-large@2x.png";

function BrandGlyphImage({ className, sizes }: { className: string; sizes: string }) {
  return (
    <span className={`${className} relative block overflow-visible`} aria-hidden="true">
      <Image
        src={BRAND_EMBLEM_SRC}
        alt=""
        fill
        sizes={sizes}
        className="object-contain"
      />
    </span>
  );
}

export default function BrandMark({
  variant = "lockup",
  className = "",
  subtitle,
  compact = false,
}: BrandMarkProps) {
  if (variant === "monogram") {
    return (
      <span className={`brand-mark-monogram ${className}`.trim()}>
        <BrandGlyphImage className="brand-mark-glyph" sizes="43px" />
      </span>
    );
  }

  return (
    <div className={`brand-lockup ${compact ? "brand-lockup-compact" : ""} ${className}`.trim()}>
      <span className="brand-lockup-glyph-shell">
        <BrandGlyphImage className="brand-lockup-glyph" sizes="(max-width: 768px) 38px, 61px" />
      </span>
      <span className="brand-lockup-copy">
        <span className="brand-lockup-row">
          <span className="brand-devilfruit">DEVILFRUIT</span>
          <span className="brand-divider" />
          <span className="brand-tcg">TCG</span>
        </span>
        {subtitle ? <span className="brand-subtitle">{subtitle}</span> : null}
      </span>
    </div>
  );
}
