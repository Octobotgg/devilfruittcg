"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { MOTION } from "@/lib/motion/standards";

type DonButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
};

function DonVisual({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg border border-white/30 bg-[#0e1118] px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-white ${className}`}
      style={{
        boxShadow: "0 0 0 1px rgba(255,255,255,0.15), 0 8px 18px rgba(0,0,0,0.35), inset 0 0 12px color-mix(in oklab, var(--theme-accent) 35%, transparent)",
      }}
    >
      {children}
    </span>
  );
}

export default function DonButton({ children, href, onClick, className = "", type = "button" }: DonButtonProps) {
  const reduced = useReducedMotion();

  const content = (
    <motion.span
      whileHover={reduced ? undefined : MOTION.hoverLift}
      whileTap={reduced ? undefined : MOTION.tap}
      transition={reduced ? { duration: 0 } : MOTION.spring}
      className="inline-flex"
    >
      <DonVisual className={className}>{children}</DonVisual>
    </motion.span>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return (
    <button type={type} onClick={onClick}>
      {content}
    </button>
  );
}
