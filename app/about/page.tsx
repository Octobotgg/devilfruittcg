import type { Metadata } from "next";
import { Pirata_One, Crimson_Pro, DM_Sans } from "next/font/google";
import AboutPageClient from "@/components/about/AboutPageClient";
import "./about.css";

const pirataOne = Pirata_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pirata",
  display: "swap",
});

const crimsonPro = Crimson_Pro({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-crimson",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm",
  display: "swap",
});

export const metadata: Metadata = {
  title: "About — DevilFruitTCG.gg",
  description:
    "A One Piece TCG home base built by a player who got tired of bouncing between five tabs just to prep for locals.",
};

export default function AboutPage() {
  return (
    <div
      className={`about-page ${pirataOne.variable} ${crimsonPro.variable} ${dmSans.variable}`}
    >
      <AboutPageClient />
    </div>
  );
}
