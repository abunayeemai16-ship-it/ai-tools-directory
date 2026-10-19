import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CompareSearch } from "@/components/compare/CompareSearch";
import { LiveCompare } from "@/components/compare/LiveCompare";
import { AffiliateButton } from "@/components/tools/AffiliateButton";
import { ToolLogo } from "@/components/tools/ToolLogo";
import { parseCompareNames } from "@/lib/compare";
import { liveCompareEnabled } from "@/lib/live-compare";
import { getCompareSearchData, getCustomCompareData } from "@/lib/public-data";
import type { DirectoryCategory, Tool } from "@/lib/types";
import { cn } from "@/lib/utils";

export const instant = false;

type Search = Record<string, string | string[] | undefined>;

function namesFrom(search: Search) {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  return parseCompareNames(first(search.a), first(search.b));
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<Metadata> {
  const [names, { tools }] = await Promise.all([searchParams.then(namesFrom), getCompareSearchData()]);
  const label = (value: string) =>
    tools.find((tool) => tool.slug === value.toLowerCase())?.name ?? value;
  return {
    title:
      typeof names === "string"
        ? "Compare AI tools"
        : `${label(names.a)} vs ${label(names.b)}: AI tool comparison`,
    robots: { index: false, follow: true },
  };
}

function entryPlan(tool: Tool) {
  const tier = tool.pricingTiers[0];
  if (!tier) return tool.pricingModel;
  const period = tier.period?.trim() ?? "";
  return `${tier.name}: ${tier.price}${!period ? "" : period.startsWith("/") ? period : ` / ${period}`}`;
}

function categoryName(tool: Tool, categories: DirectoryCategory[]) {
  return categories.find((item) => item.slug === tool.category)?.name ?? tool.category;
}

function DirectoryComparison({
  toolA,
  toolB,
  categories,
}: {
  toolA: Tool;
  toolB: Tool;
  categories: DirectoryCategory[];
}) {
  const higher: "a" | "b" | null =
    toolA.rating === toolB.rating ? null : toolA.rating > toolB.rating ? "a" : "b";
  type Row = { label: string; a: string; b: string; highlight?: "a" | "b" | null };
  const allRows: Row[] = [
    { label: "Pricing model", a: toolA.pricingModel, b: toolB.pricingModel },
    { label: "Entry plan", a: entryPlan(toolA), b: entryPlan(toolB) },
    {
      label: "Forge rating",
      a: `${toolA.rating.toFixed(1)} / 5`,
      b: `${toolB.rating.toFixed(1)} / 5`,
      highlight: higher,
    },
    { label: "Best for", a: toolA.bestFor, b: toolB.bestFor },
    { label: "Category", a: categoryName(toolA, categories), b: categoryName(toolB, categories) },
    { label: "Founded", a: toolA.founded, b: toolB.founded },
    { label: "Key features", a: toolA.features.slice(0, 3).join(" · "), b: toolB.features.slice(0, 3).join(" · ") },
    { label: "Strengths", a: toolA.pros.slice(0, 2).join(" · "), b: toolB.pros.slice(0, 2).join(" · ") },
    { label: "Watch-outs", a: toolA.cons.slice(0, 2).join(" · "), b: toolB.cons.slice(0, 2).join(" · ") },
  ];
  const rows = allRows.filter((row) => row.a || row.b);

  return (
    <section className="mt-10">
      <p className="text-xs uppercase tracking-[0.18em] text-accent">From the Forge directory</p>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {[toolA, toolB].map((tool) => (
          <div key={tool.slug} className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center gap-3">
              <ToolLogo name={tool.name} category={tool.category} color={tool.brandColor} />
              <div>
                <Link href={`/tool/${tool.slug}`} className="font-semibold hover:text-accent">
                  {tool.name}
                </Link>
                <p className="text-xs text-muted">{tool.pricingModel}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted">{tool.shortPitch}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <AffiliateButton slug={tool.slug} />
              <Link
                href={`/tool/${tool.slug}`}
                className="inline-flex items-center rounded-full border border-line px-4 py-2 text-sm text-muted hover:text-white"
              >
                Read review
              </Link>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-surface-2 text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Feature</th>
              <th className="px-4 py-3 font-medium">{toolA.name}</th>
              <th className="px-4 py-3 font-medium">{toolB.name}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-line align-top">
                <td className="px-4 py-3">{row.label}</td>
                <td className={cn("px-4 py-3", row.highlight === "a" && "text-mint")}>{row.a || "—"}</td>
                <td className={cn("px-4 py-3", row.highlight === "b" && "text-mint")}>{row.b || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function CustomComparePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const [search, names] = await Promise.all([
    getCompareSearchData(),
    searchParams.then(namesFrom),
  ]);

  const data = typeof names === "string" ? null : await getCustomCompareData(names.a, names.b);
  const sameTool = Boolean(data?.toolA && data.toolA.slug === data.toolB?.slug);

  if (typeof names === "string" || !data || sameTool) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="font-serif text-4xl sm:text-5xl">Compare AI tools</h1>
        {sameTool ? <p className="mt-3 text-sm text-rose">Pick two different tools.</p> : null}
        <div className="mt-8">
          <CompareSearch tools={search.tools} pairs={search.pairs} />
        </div>
      </div>
    );
  }

  if (data.existingSlug) redirect(`/compare/${data.existingSlug}`);
  const nameA = data.toolA?.name ?? names.a;
  const nameB = data.toolB?.name ?? names.b;
  const missing = [!data.toolA && nameA, !data.toolB && nameB].filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-xs text-muted">
        <Link href="/compare" className="hover:text-accent">
          Compare
        </Link>{" "}
        / {nameA} vs {nameB}
      </p>
      <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">
        {nameA} vs {nameB}
      </h1>
      <div className="mt-6">
        <CompareSearch tools={search.tools} pairs={search.pairs} initialA={nameA} initialB={nameB} />
      </div>

      {data.toolA && data.toolB ? (
        <DirectoryComparison toolA={data.toolA} toolB={data.toolB} categories={data.categories} />
      ) : (
        <p className="mt-8 text-sm text-muted">
          {missing.join(" and ")} {missing.length > 1 ? "are" : "is"} not in the Forge directory yet,
          so this comparison comes from a live web search.
        </p>
      )}

      <LiveCompare
        key={`${nameA}|${nameB}`}
        a={nameA}
        b={nameB}
        autoStart={missing.length > 0}
        enabled={liveCompareEnabled()}
        slugA={data.toolA?.slug}
        slugB={data.toolB?.slug}
      />
    </div>
  );
}
