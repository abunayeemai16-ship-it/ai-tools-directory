import Link from "next/link";
import type { Metadata } from "next";
import { Swords } from "lucide-react";
import { getCompareHubData } from "@/lib/public-data";
import { ToolLogo } from "@/components/tools/ToolLogo";

export const instant = false;

export const metadata: Metadata = {
  title: "AI Tool Comparisons",
  description:
    "Side-by-side VS comparisons of popular AI tools with feature winner badges and affiliate CTAs.",
};

export default async function CompareHubPage() {
  const entries = await getCompareHubData();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-xs uppercase tracking-[0.18em] text-accent">VS desk</p>
      <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Comparison hub</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Feature-level matchups with a clear winner badge so you can pick a stack
        without reading two marketing sites.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {entries.map(({ comparison, toolA, toolB }) => (
          <Link
            key={comparison.slug}
            href={`/compare/${comparison.slug}`}
            className="rounded-2xl border border-line bg-surface p-5 transition hover:border-accent/40"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ToolLogo name={toolA.name} category={toolA.category} color={toolA.brandColor} size="sm" />
                <span className="font-medium">{toolA.name}</span>
              </div>
              <Swords className="h-4 w-4 text-accent" />
              <div className="flex items-center gap-2">
                <span className="font-medium">{toolB.name}</span>
                <ToolLogo name={toolB.name} category={toolB.category} color={toolB.brandColor} size="sm" />
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">{comparison.tagline}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
