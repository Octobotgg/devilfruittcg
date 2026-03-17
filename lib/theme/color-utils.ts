import type { CSSProperties } from "react";
import type { LeaderColor } from "./leader-theme";
import { LEADER_THEME_MAP } from "./leader-theme";

export function parseLeaderColors(raw?: string): LeaderColor[] {
  const value = (raw || "").toLowerCase();
  const colors: LeaderColor[] = [];
  const add = (c: LeaderColor) => {
    if (!colors.includes(c)) colors.push(c);
  };

  if (value.includes("red")) add("red");
  if (value.includes("green")) add("green");
  if (value.includes("blue")) add("blue");
  if (value.includes("purple")) add("purple");
  if (value.includes("black")) add("black");
  if (value.includes("yellow")) add("yellow");

  return colors.length ? colors : ["red"];
}

export function deckColorPillStyle(raw?: string): CSSProperties {
  const [primary, secondary] = parseLeaderColors(raw);
  const c1 = LEADER_THEME_MAP[primary].accent;
  const c2 = LEADER_THEME_MAP[secondary || primary].accent;

  return {
    border: "1px solid color-mix(in oklab, var(--theme-accent) 45%, transparent)",
    background: `linear-gradient(135deg, color-mix(in oklab, ${c1} 28%, transparent), color-mix(in oklab, ${c2} 26%, transparent))`,
    color: "#f8fbff",
  };
}
