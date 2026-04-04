import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "One Piece TCG Card Database and Collection Tracker",
  description: "Browse the One Piece TCG card database and manage your collection value on Devil Fruit TCG.",
  alternates: {
    canonical: absoluteUrl("/collection"),
  },
};

export default function CollectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
