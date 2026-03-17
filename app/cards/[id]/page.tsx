import { notFound } from "next/navigation";
import CardDetailClient from "@/components/market/CardDetailClient";
import { getOfficialCardById, getOfficialVariantsByBaseId } from "@/lib/official-cards";

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cardId = decodeURIComponent(id).trim().toUpperCase();
  const card = getOfficialCardById(cardId);

  if (!card) notFound();

  const variants = getOfficialVariantsByBaseId(card.id);

  return <CardDetailClient key={card.id} initialCard={card} variants={variants} />;
}
