import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { DirectoryExplorer } from "@/components/directory/DirectoryExplorer";
import { ToolCard } from "@/components/tools/ToolCard";
import { getHomeData, getHomeSeo } from "@/lib/public-data";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const seo = await getHomeSeo();
    return {
      title: { absolute: seo.title },
      description: seo.description,
      openGraph: {
        title: seo.title,
        description: seo.description,
        type: "website",
      },
    };
  } catch {
    return {
      title: { absolute: "Forge — AI Tools Directory" },
      description: "Independent AI tools reviews.",
    };
  }
}

export default async function HomePage() {
  const { tools, featured, categories, ads } = await getHomeData();

  return (
    <>
      <DirectoryExplorer tools={tools} categories={categories} ads={ads} />
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
            {featured.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} categories={categories} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
