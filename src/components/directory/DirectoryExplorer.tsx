"use client";

import { ChevronDown, ChevronUp, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { AdImpression } from "@/components/ads/AdImpression";
import { PartnerBanner } from "@/components/ads/PartnerBanner";
import { ToolCard } from "@/components/tools/ToolCard";
import { categoryLabel } from "@/lib/categories";
import type { AdCampaign, DirectoryCategory, Tool } from "@/lib/types";
import { cn } from "@/lib/utils";

const COMPACT_COUNT = 7;
const PAGE_SIZE = 24;

type SortKey = "featured" | "rating" | "popular" | "name";

export function DirectoryExplorer({
  tools,
  categories,
  ads = [],
}: {
  tools: Tool[];
  categories: DirectoryCategory[];
  ads?: AdCampaign[];
}) {
  const [query, setQuery] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [price, setPrice] = useState("All");
  const [sort, setSort] = useState<SortKey>("featured");
  const [expanded, setExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const tool of tools) {
      map.set(tool.category, (map.get(tool.category) || 0) + 1);
    }
    return map;
  }, [tools]);

  const visible = expanded ? categories : categories.slice(0, COMPACT_COUNT);

  const heroAds = useMemo(() => ads.filter((ad) => ad.placement === "hero_banner"), [ads]);
  const pinnedAds = useMemo(() => ads.filter((ad) => ad.placement === "pinned_grid"), [ads]);
  const categoryAds = useMemo(
    () =>
      category === "All"
        ? []
        : ads.filter((ad) => ad.placement === "category_sponsor" && ad.targetCategory === category),
    [ads, category],
  );
  const pinnedSlugs = useMemo(
    () => new Set(pinnedAds.map((ad) => ad.toolSlug).filter(Boolean)),
    [pinnedAds],
  );
  const pinnedBadge = useMemo(() => {
    const map = new Map<string, string>();
    for (const ad of pinnedAds) {
      if (ad.toolSlug && !map.has(ad.toolSlug)) {
        map.set(ad.toolSlug, ad.badgeText || "Partner Spotlight");
      }
    }
    return map;
  }, [pinnedAds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const nameQ = nameQuery.trim().toLowerCase();
    const rows = tools.filter((tool) => {
      const label = categoryLabel(tool.category, categories);
      const matchesCategory = category === "All" || tool.category === category;
      const matchesPrice = price === "All" || tool.pricingModel === price;
      const matchesName = !nameQ || tool.name.toLowerCase().includes(nameQ);
      const matchesQuery =
        !q ||
        tool.name.toLowerCase().includes(q) ||
        tool.shortPitch.toLowerCase().includes(q) ||
        tool.bestFor.toLowerCase().includes(q) ||
        label.toLowerCase().includes(q);
      return matchesCategory && matchesPrice && matchesName && matchesQuery;
    });
    rows.sort((a, b) => {
      const aPinned = pinnedSlugs.has(a.slug);
      const bPinned = pinnedSlugs.has(b.slug);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "rating") {
        return b.rating - a.rating || b.reviewCount - a.reviewCount;
      }
      if (sort === "popular") {
        return b.reviewCount - a.reviewCount || b.rating - a.rating;
      }
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return b.rating - a.rating || b.reviewCount - a.reviewCount;
    });
    return rows;
  }, [tools, query, nameQuery, category, price, categories, sort, pinnedSlugs]);

  const shown = filtered.slice(0, visibleCount);
  const activeName = category === "All" ? "" : categoryLabel(category, categories);

  function setFilter(next: string) {
    setCategory(next);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <div>
      <section className="relative overflow-hidden border-b border-line">
        <div className="hero-glow noise absolute inset-0" />
        <div className="grid-fade absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            Featured Tools inside — independent 2026 reviews
          </div>
          <h1 className="mt-5 max-w-3xl font-serif text-4xl leading-[1.1] tracking-tight sm:text-6xl">
            Find the AI tool worth paying for.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted sm:text-lg">
            Search the directory, filter by job-to-be-done, and jump to
            schema-backed reviews with live affiliate deals.
          </p>

          <form
            className="mt-8 max-w-3xl"
            onSubmit={(event) => event.preventDefault()}
          >
            <label className="relative block">
              <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                placeholder="Search Jasper, Cursor, ElevenLabs..."
                className="h-14 w-full rounded-2xl border border-line bg-surface/80 pr-4 pl-12 text-base outline-none ring-accent/40 placeholder:text-muted focus:ring-2"
              />
            </label>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <label className="block">
                <span className="sr-only">Tool name</span>
                <input
                  value={nameQuery}
                  onChange={(event) => {
                    setNameQuery(event.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  placeholder="Tool name"
                  className="h-11 w-full rounded-xl border border-line bg-surface/80 px-3 text-sm outline-none ring-accent/40 placeholder:text-muted focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="sr-only">Category</span>
                <select
                  value={category}
                  onChange={(event) => setFilter(event.target.value)}
                  className="h-11 w-full rounded-xl border border-line bg-surface/80 px-3 text-sm outline-none ring-accent/40 focus:ring-2"
                >
                  <option value="All">Category</option>
                  {categories.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="sr-only">Price</span>
                <select
                  value={price}
                  onChange={(event) => {
                    setPrice(event.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className="h-11 w-full rounded-xl border border-line bg-surface/80 px-3 text-sm outline-none ring-accent/40 focus:ring-2"
                >
                  <option value="All">Price</option>
                  <option value="Free">Free</option>
                  <option value="Freemium">Freemium</option>
                  <option value="Paid">Paid</option>
                </select>
              </label>
            </div>
          </form>

          {heroAds.length > 0 ? (
            <div className="mt-6 max-w-3xl">
              <PartnerBanner ads={heroAds} />
            </div>
          ) : null}

          <div className="mt-5 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] sm:flex-wrap sm:overflow-visible">
              <Chip active={category === "All"} onClick={() => setFilter("All")}>
                All ({tools.length})
              </Chip>
              {visible.map((item) => (
                <Chip
                  key={item.slug}
                  active={category === item.slug}
                  onClick={() => setFilter(item.slug)}
                >
                  {item.name} ({counts.get(item.slug) || 0})
                </Chip>
              ))}
              {categories.length > COMPACT_COUNT ? (
                <button
                  type="button"
                  onClick={() => setExpanded((value) => !value)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-surface/80 px-3.5 py-1.5 text-sm text-muted hover:text-white"
                >
                  {expanded ? (
                    <>
                      Show Less <ChevronUp className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      Show All Categories <ChevronDown className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              Directory
            </p>
            <h2 className="mt-1 font-serif text-3xl">
              {filtered.length} tool{filtered.length === 1 ? "" : "s"}
              {activeName ? ` in ${activeName}` : ""}
            </h2>
          </div>
          <label className="text-sm">
            <span className="sr-only">Sort tools</span>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as SortKey);
                setVisibleCount(PAGE_SIZE);
              }}
              className="h-10 rounded-full border border-line bg-surface px-3 text-sm outline-none"
            >
              <option value="featured">Featured First</option>
              <option value="rating">Highest Rated</option>
              <option value="popular">Most Popular</option>
              <option value="name">Name (A–Z)</option>
            </select>
          </label>
        </div>
        {categoryAds.length > 0 ? (
          <div className="mt-6">
            <PartnerBanner ads={categoryAds} />
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-dashed border-line p-10 text-center text-muted">
            No tools match that search. Try another category or a shorter query.
          </p>
        ) : (
          <>
            <AdImpression
              ids={pinnedAds
                .filter((ad) => shown.some((tool) => tool.slug === ad.toolSlug))
                .map((ad) => ad.id)}
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((tool, index) => (
                <ToolCard
                  key={tool.slug}
                  tool={tool}
                  categories={categories}
                  spotlight={pinnedSlugs.has(tool.slug)}
                  spotlightLabel={pinnedBadge.get(tool.slug) || "Partner Spotlight"}
                  eager={index < 3}
                />
              ))}
            </div>
            {shown.length < filtered.length ? (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  className="rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-medium hover:border-accent/40 hover:text-accent"
                >
                  Load More Tools (Showing {shown.length} of {filtered.length})
                </button>
              </div>
            ) : (
              <p className="mt-8 text-center text-sm text-muted">
                Showing {shown.length} of {filtered.length}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap transition",
        active
          ? "border-accent bg-accent text-ink"
          : "border-line bg-surface/50 text-muted hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
