import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CardDetailClient from "@/components/market/CardDetailClient";
import { getOfficialCardById, getOfficialVariantsByBaseId } from "@/lib/official-cards";
import { displayCardId, routeCardId } from "@/lib/cards";
import { absoluteUrl, siteConfig } from "@/lib/site";

type CardRouteContext = {
  params: Promise<{ id: string }>;
};

function buildCardDescription(card: NonNullable<ReturnType<typeof getOfficialCardById>>) {
  const identity = displayCardId(card);
  const bits = [
    `${card.name} (${identity})`,
    `${card.color} ${card.type}`,
    `from ${card.set}`,
    "One Piece TCG card details, variants, and market pricing",
  ];

  return `${bits.join(" · ")} on ${siteConfig.name}.`;
}

export async function generateMetadata({ params }: CardRouteContext): Promise<Metadata> {
  const { id } = await params;
  const cardId = decodeURIComponent(id).trim().toUpperCase();
  const card = getOfficialCardById(cardId);

  if (!card) {
    return {
      title: "Card Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const canonicalPath = `/cards/${routeCardId(card)}`;
  const description = buildCardDescription(card);
  const image = absoluteUrl(`/api/card-image?id=${encodeURIComponent(card.id)}`);
  const title = `${card.name} ${displayCardId(card)} One Piece TCG Price, Details & Variants`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(canonicalPath),
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(canonicalPath),
      images: [{ url: image, alt: `${card.name} card image` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function CardDetailPage({
  params,
}: CardRouteContext) {
  const { id } = await params;
  const cardId = decodeURIComponent(id).trim().toUpperCase();
  const card = getOfficialCardById(cardId);

  if (!card) notFound();

  const variants = getOfficialVariantsByBaseId(card.id);
  const canonicalPath = absoluteUrl(`/cards/${routeCardId(card)}`);
  const image = absoluteUrl(`/api/card-image?id=${encodeURIComponent(card.id)}`);
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${card.name} ${displayCardId(card)}`,
    category: "One Piece TCG Card",
    brand: {
      "@type": "Brand",
      name: "Bandai",
    },
    image,
    description: buildCardDescription(card),
    sku: card.id,
    productID: card.id,
    url: canonicalPath,
    additionalProperty: [
      { "@type": "PropertyValue", name: "Set", value: card.set },
      { "@type": "PropertyValue", name: "Set Code", value: card.setCode },
      { "@type": "PropertyValue", name: "Card Number", value: card.number },
      { "@type": "PropertyValue", name: "Type", value: card.type },
      { "@type": "PropertyValue", name: "Color", value: card.color },
      { "@type": "PropertyValue", name: "Rarity", value: card.rarity },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <CardDetailClient key={card.id} initialCard={card} variants={variants} />
    </>
  );
}
