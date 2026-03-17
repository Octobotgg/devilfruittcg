export type LeaderColor = "red" | "green" | "blue" | "purple" | "black" | "yellow";

type ThemeSwatch = {
  accent: string;
  accent2: string;
  glow: string;
  ring: string;
};

export const LEADER_THEME_MAP: Record<LeaderColor, ThemeSwatch> = {
  red: {
    accent: "#ef4444",
    accent2: "#fb7185",
    glow: "rgba(239, 68, 68, 0.45)",
    ring: "rgba(239, 68, 68, 0.30)",
  },
  green: {
    accent: "#22c55e",
    accent2: "#86efac",
    glow: "rgba(34, 197, 94, 0.45)",
    ring: "rgba(34, 197, 94, 0.30)",
  },
  blue: {
    accent: "#3b82f6",
    accent2: "#93c5fd",
    glow: "rgba(59, 130, 246, 0.45)",
    ring: "rgba(59, 130, 246, 0.30)",
  },
  purple: {
    accent: "#a855f7",
    accent2: "#d8b4fe",
    glow: "rgba(168, 85, 247, 0.45)",
    ring: "rgba(168, 85, 247, 0.30)",
  },
  black: {
    accent: "#94a3b8",
    accent2: "#e2e8f0",
    glow: "rgba(148, 163, 184, 0.4)",
    ring: "rgba(148, 163, 184, 0.28)",
  },
  yellow: {
    accent: "#facc15",
    accent2: "#fde68a",
    glow: "rgba(250, 204, 21, 0.45)",
    ring: "rgba(250, 204, 21, 0.30)",
  },
};

export function getLeaderGradient(primary: LeaderColor, secondary?: LeaderColor) {
  if (!secondary || secondary === primary) {
    return `linear-gradient(135deg, ${LEADER_THEME_MAP[primary].accent}, ${LEADER_THEME_MAP[primary].accent2})`;
  }

  return `linear-gradient(135deg, ${LEADER_THEME_MAP[primary].accent}, ${LEADER_THEME_MAP[secondary].accent})`;
}

export function setThemeByLeaderColor(color: LeaderColor, root?: HTMLElement) {
  if (typeof document === "undefined") return;
  const el = root ?? document.documentElement;
  const swatch = LEADER_THEME_MAP[color];

  el.style.setProperty("--theme-accent", swatch.accent);
  el.style.setProperty("--theme-accent-2", swatch.accent2);
  el.style.setProperty("--theme-glow", swatch.glow);
  el.style.setProperty("--theme-ring", swatch.ring);
  el.setAttribute("data-leader-theme", color);
}
