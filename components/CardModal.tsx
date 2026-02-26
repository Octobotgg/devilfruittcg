"use client";
import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, ExternalLink } from "lucide-react";
import Link from "next/link";

export interface CardModalData {
  id: string;
  name: string;
  set?: string;
  setCode?: string;
  number?: string;
  type?: string;
  color?: string;
  rarity?: string;
  cost?: number;
  power?: number;
  attribute?: string;
  imageUrl?: string;
}

const rarityBadge: Record<string, string> = {
  L:   "text-[#F0C040] bg-[#F0C040]/15 border-[#F0C040]/40",
  SEC: "text-pink-400   bg-pink-400/15   border-pink-400/40",
  SR:  "text-purple-400 bg-purple-400/15 border-purple-400/40",
  R:   "text-blue-400   bg-blue-400/15   border-blue-400/40",
  UC:  "text-green-400  bg-green-400/15  border-green-400/40",
  C:   "text-white/50   bg-white/5       border-white/15",
};

const colorDot: Record<string, string> = {
  Red:    "bg-red-500",
  Green:  "bg-green-500",
  Blue:   "bg-blue-500",
  Purple: "bg-purple-500",
  Black:  "bg-gray-400",
  Yellow: "bg-yellow-400",
};

interface Props {
  card: CardModalData | null;
  onClose: () => void;
}

export default function CardModal({ card, onClose }: Props) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // Lock body scroll while open
  useEffect(() => {
    if (card) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [card]);

  const imageUrl = card?.imageUrl || (card ? `/api/card-image?id=${card.id}` : "");

  return (
    <AnimatePresence>
      {card && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

          {/* Modal */}
          <motion.div
            key="modal-content"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.85, y: 20  }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative z-10 flex flex-col md:flex-row gap-6 bg-[#0c1324]/95 border border-white/10 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl shadow-black/60"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Card Image */}
            <motion.div
              className="flex-shrink-0 mx-auto md:mx-0"
              whileHover={{ scale: 1.03, rotate: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <img
                src={imageUrl}
                alt={card.name}
                className="w-48 md:w-56 rounded-2xl shadow-2xl shadow-black/60 border border-white/10"
              />
            </motion.div>

            {/* Card Info */}
            <div className="flex-1 min-w-0">
              {/* Name + rarity */}
              <div className="flex items-start gap-3 mb-1 pr-8">
                <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">{card.name}</h2>
              </div>
              <div className="flex items-center gap-2 mb-5">
                <span className="font-mono text-white/30 text-sm">{card.id}</span>
                {card.rarity && (
                  <span className={`text-xs px-2 py-0.5 rounded-lg border font-black ${rarityBadge[card.rarity] ?? rarityBadge.C}`}>
                    {card.rarity}
                  </span>
                )}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { label: "Set",    value: card.set ?? "—" },
                  { label: "Type",   value: card.type ?? "—" },
                  { label: "Color",  value: card.color ?? "—", isColor: true },
                  { label: "Cost",   value: card.cost !== undefined ? String(card.cost) : "—" },
                  { label: "Power",  value: card.power !== undefined ? card.power.toLocaleString() : "—" },
                  { label: "Attribute", value: card.attribute ?? "—" },
                ].map(stat => (
                  <div key={stat.label} className="bg-white/5 border border-white/8 rounded-xl px-3 py-2.5">
                    <div className="text-white/30 text-[10px] uppercase tracking-wider mb-0.5">{stat.label}</div>
                    <div className="text-white text-sm font-semibold flex items-center gap-1.5">
                      {(stat as any).isColor && stat.value !== "—" && (
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colorDot[stat.value.split("/")[0]] ?? "bg-white/30"}`} />
                      )}
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Card text note */}
              <p className="text-white/30 text-xs mb-5 italic">
                💡 Zoom into the card image to read effect text
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <Link href={`/market?card=${encodeURIComponent(card.name)}`} className="flex-1">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#F0C040] to-[#DC2626] text-black font-bold rounded-xl text-sm"
                    onClick={onClose}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Check Price
                  </motion.button>
                </Link>
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(card.name + " " + card.id + " One Piece TCG")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-4 py-3 bg-white/5 border border-white/10 text-white/60 hover:text-white rounded-xl transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </motion.button>
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
