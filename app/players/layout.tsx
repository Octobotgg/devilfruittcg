import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "One Piece TCG Players Directory",
  description: "Search public Devil Fruit TCG player profiles, favorite leaders, and community captains.",
  alternates: {
    canonical: absoluteUrl("/players"),
  },
};

export default function PlayersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
