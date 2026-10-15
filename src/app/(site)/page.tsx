import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { DirectoryExplorer } from "@/components/directory/DirectoryExplorer";
import { ToolCard } from "@/components/tools/ToolCard";
import { liveAds } from "@/lib/ads";
import { getFeaturedTools, listAds, listCategories, listTools, readDb } from "@/lib/db";
import { live } from "@/lib/live";
import type { Tool } from "@/lib/types";

function toCard(tool: Tool): Tool {
  return {
    ...tool,
    overview: "",
    features: [],
    pros: [],
    cons: [],
    pricingTiers: [],
    faqs: [],
    jsonLd: undefined,
  };
}

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  await live();
  const db = await readDb();
  return {
    title: { absolute: db.settings.homeSeoTitle },
    description: db.settings.homeSeoDescription,
    openGraph: {
      title: db.settings.homeSeoTitle,
      description: db.settings.homeSeoDescription,
      type: "website",
    },
  };
}

export default async function HomePage() {
  await live();
  const [tools, featured, categories, ads] = await Promise.all([
    listTools(),
    getFeaturedTools(),
    listCategories(),
    listAds(),
  ]);

  return (
    <>
      <DirectoryExplorer
        tools={tools.map(toCard)}
        categories={categories}
        ads={liveAds(ads)}
      />
      <section className="border-t border-line bg-ink-2">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-accent">
                <BadgeCheck className="h-3.5 w-3.5" />
                Featured Tools
              </p>
              <h2 className="mt-2 font-serif text-3xl">Editors&apos; shortlist</h2>
            </div>
            <Link href="/deals" className="text-sm text-muted hover:text-accent">
              Browse live deals →
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.slice(0, 6).map((tool) => (
              <ToolCard key={tool.slug} tool={toCard(tool)} categories={categories} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
