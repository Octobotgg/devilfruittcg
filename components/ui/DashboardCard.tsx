"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { MOTION } from "@/lib/motion/standards";

type DashboardCardProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

export default function DashboardCard({ title, subtitle, children, className = "" }: DashboardCardProps) {
  const reduced = useReducedMotion();

  return (
    <motion.section
      whileHover={reduced ? undefined : MOTION.hoverLift}
      transition={reduced ? { duration: 0 } : MOTION.spring}
      className={`panel-surface theme-glow rounded-2xl p-4 md:p-5 ${className}`}
    >
      {(title || subtitle) && (
        <header className="mb-3">
          {title ? <h3 className="text-lg font-black tracking-tight text-[var(--text-primary)]">{title}</h3> : null}
          {subtitle ? <p className="text-sm text-[var(--text-muted)]">{subtitle}</p> : null}
        </header>
      )}
      {children}
    </motion.section>
  );
}
