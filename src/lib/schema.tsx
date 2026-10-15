import type { Comparison, Tool } from "@/lib/types";

export function softwareApplicationSchema(tool: Tool) {
  const numeric = tool.pricingTiers
    .map((tier) => Number(tier.price.replace(/[^0-9.]/g, "")))
    .find((value) => !Number.isNaN(value));

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    url: `https://forge.directory/tool/${tool.slug}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: tool.metaDescription,
    offers: {
      "@type": "Offer",
      price: String(numeric ?? 0),
      priceCurrency: "USD",
      category: tool.pricingModel,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: tool.rating.toFixed(1),
      reviewCount: String(tool.reviewCount),
      bestRating: "5",
      worstRating: "1",
    },
  };
}

export function faqSchema(tool: Tool) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: tool.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function comparisonSchema(
  comparison: Comparison,
  aName: string,
  bName: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${aName} vs ${bName}`,
    description: comparison.tagline,
    about: [
      { "@type": "SoftwareApplication", name: aName },
      { "@type": "SoftwareApplication", name: bName },
    ],
  };
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
