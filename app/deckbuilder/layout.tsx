import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "One Piece TCG Deck Builder",
  description: "Build, tune, and save One Piece TCG decks with live card data on Devil Fruit TCG.",
  alternates: {
    canonical: absoluteUrl("/deckbuilder"),
  },
};

export default function DeckbuilderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
