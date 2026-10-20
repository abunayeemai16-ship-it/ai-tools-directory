import type { Metadata } from "next";
import { DealCard } from "@/components/deals/DealCard";
import { live } from "@/lib/live";
import { getDealsData } from "@/lib/public-data";

export const instant = false;

export const metadata: Metadata = {
  title: "AI Deals & Coupons",
  description:
    "Live promo codes and discounts on featured AI tools. Copy a coupon and visit through tracked affiliate links.",
};

export default async function DealsPage() {
  // Admin clears must show up on refresh — skip the 24h directory CDN cache.
  await live();
  const { deals, categories } = await getDealsData();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-xs uppercase tracking-[0.18em] text-accent">Limited drops</p>
      <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Deals & coupons</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Codes are mapped in the affiliate manager. Copy applies the promo; the
        visit still routes through Forge click tracking.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {deals.map((tool) => (
          <DealCard key={tool.slug} tool={tool} categories={categories} />
        ))}
      </div>
    </div>
  );
}
