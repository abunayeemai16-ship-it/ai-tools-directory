import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Crown } from "lucide-react";
import { AffiliateButton } from "@/components/tools/AffiliateButton";
import { ToolLogo } from "@/components/tools/ToolLogo";
import {
  getComparisonBySlug,
  getComparisonTools,
  listComparisons,
} from "@/lib/db";
import { live } from "@/lib/live";
import { comparisonSchema, JsonLd } from "@/lib/schema";
import { cn } from "@/lib/utils";

export const instant = false;

export async function generateStaticParams() {
  const comparisons = await listComparisons();
  return comparisons.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/compare/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const comparison = await getComparisonBySlug(slug);
  const pair = comparison ? await getComparisonTools(comparison) : null;
  if (!comparison || !pair) return { title: "Comparison not found" };
  return {
    title: comparison.seoTitle || `${pair.toolA.name} vs ${pair.toolB.name}`,
    description: comparison.metaDescription || comparison.tagline,
  };
}

export default async function ComparisonPage({
  params,
}: PageProps<"/compare/[slug]">) {
  await live();
  const { slug } = await params;
  const comparison = await getComparisonBySlug(slug);
  const pair = comparison ? await getComparisonTools(comparison) : null;
  if (!comparison || !pair) notFound();
  const { toolA, toolB } = pair;
  const overall =
    comparison.overallWinner === "a"
      ? toolA.name
      : comparison.overallWinner === "b"
        ? toolB.name
        : "It depends";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <JsonLd data={comparisonSchema(comparison, toolA.name, toolB.name)} />
      <p className="text-xs text-muted">
        <Link href="/compare" className="hover:text-accent">
          Compare
        </Link>{" "}
        / {toolA.name} vs {toolB.name}
      </p>
      <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">
        {toolA.name} vs {toolB.name}
      </h1>
      <p className="mt-3 max-w-2xl text-muted">{comparison.tagline}</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {[toolA, toolB].map((tool, index) => {
          const isWinner =
            (comparison.overallWinner === "a" && index === 0) ||
            (comparison.overallWinner === "b" && index === 1);
          return (
            <div
              key={tool.slug}
              className={cn(
                "rounded-2xl border bg-surface p-5",
                isWinner ? "border-accent" : "border-line",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ToolLogo name={tool.name} category={tool.category} color={tool.brandColor} />
                  <div>
                    <p className="font-semibold">{tool.name}</p>
                    <p className="text-xs text-muted">{tool.pricingModel}</p>
                  </div>
                </div>
                {isWinner ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs font-semibold text-ink">
                    <Crown className="h-3.5 w-3.5" /> Winner
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm text-muted">{tool.shortPitch}</p>
              <AffiliateButton slug={tool.slug} className="mt-4 w-full" />
            </div>
          );
        })}
      </div>

      <div className="mt-10 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-surface-2 text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Feature</th>
              <th className="px-4 py-3 font-medium">{toolA.name}</th>
              <th className="px-4 py-3 font-medium">{toolB.name}</th>
              <th className="px-4 py-3 font-medium">Winner</th>
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => (
              <tr key={row.feature} className="border-t border-line">
                <td className="px-4 py-3">{row.feature}</td>
                <td className={cn("px-4 py-3", row.winner === "a" && "text-mint")}>
                  {row.a}
                </td>
                <td className={cn("px-4 py-3", row.winner === "b" && "text-mint")}>
                  {row.b}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                    {row.winner === "tie"
                      ? "Tie"
                      : row.winner === "a"
                        ? toolA.name
                        : toolB.name}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-10 rounded-2xl border border-line bg-surface p-6">
        <h2 className="font-serif text-2xl">Verdict</h2>
        <p className="mt-2 text-sm text-accent">Overall: {overall}</p>
        <p className="mt-3 max-w-3xl leading-7 text-muted">{comparison.verdict}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <AffiliateButton slug={toolA.slug} label={`Try ${toolA.name}`} />
          <AffiliateButton slug={toolB.slug} label={`Try ${toolB.name}`} />
        </div>
      </section>
    </div>
  );
}
