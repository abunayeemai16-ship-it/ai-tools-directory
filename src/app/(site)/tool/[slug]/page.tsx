import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Minus, Quote } from "lucide-react";
import { cookies } from "next/headers";
import { AffiliateButton } from "@/components/tools/AffiliateButton";
import { RateTool } from "@/components/tools/RateTool";
import { PricingBadge } from "@/components/tools/PricingBadge";
import { StarRating } from "@/components/tools/StarRating";
import { StickyCta } from "@/components/tools/StickyCta";
import { ToolCard } from "@/components/tools/ToolCard";
import { ToolLogo } from "@/components/tools/ToolLogo";
import { categoryLabel } from "@/lib/categories";
import { liveAds } from "@/lib/ads";
import { getRelatedTools, getToolBySlug, listAds, listCategories, listTools } from "@/lib/db";
import { live } from "@/lib/live";
import { faqSchema, JsonLd, softwareApplicationSchema } from "@/lib/schema";
import { formatNumber } from "@/lib/utils";

export const instant = false;

export async function generateStaticParams() {
  const tools = await listTools();
  return tools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/tool/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const tool = await getToolBySlug(slug);
  if (!tool) return { title: "Tool not found" };
  return {
    title: tool.seoTitle,
    description: tool.metaDescription,
    openGraph: {
      title: tool.seoTitle,
      description: tool.metaDescription,
      type: "article",
    },
  };
}

export default async function ToolPage({ params }: PageProps<"/tool/[slug]">) {
  await live();
  const { slug } = await params;
  const tool = await getToolBySlug(slug);
  if (!tool) notFound();
  const related = await getRelatedTools(tool);
  const categories = await listCategories();
  const promoAds = liveAds(await listAds(), "review_sidebar");
  const categoryName = categoryLabel(tool.category, categories);
  const rated = ((await cookies()).get("forge_rated")?.value || "")
    .split(",")
    .filter(Boolean);
  const alreadyRated = rated.includes(tool.slug);

  return (
    <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <JsonLd data={tool.jsonLd ?? softwareApplicationSchema(tool)} />
      <JsonLd data={faqSchema(tool)} />

      <p className="text-xs text-muted">
        <Link href="/" className="hover:text-accent">
          Directory
        </Link>{" "}
        / {categoryName} / {tool.name}
      </p>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <ToolLogo
              name={tool.name}
              category={tool.category}
              color={tool.brandColor}
              size="lg"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-4xl tracking-tight">{tool.name}</h1>
                <PricingBadge model={tool.pricingModel} />
                <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
                  {categoryName}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-lg leading-7 text-muted">
                {tool.shortPitch}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <StarRating rating={tool.rating} size="md" />
                <span className="font-medium">{tool.rating.toFixed(1)} / 5</span>
                <span className="text-muted">
                  {formatNumber(tool.reviewCount)} ratings
                </span>
                <span className="text-muted">Founded {tool.founded}</span>
              </div>
              <RateTool
                slug={tool.slug}
                rating={tool.rating}
                reviewCount={tool.reviewCount}
                alreadyRated={alreadyRated}
              />
              <div className="mt-5 lg:hidden">
                <AffiliateButton slug={tool.slug} label="Visit Website / Claim Deal" />
              </div>
            </div>
          </header>

          <section className="mt-12">
            <h2 className="font-serif text-3xl">Overview</h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted">{tool.overview}</p>
            <p className="mt-4 inline-flex items-start gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
              <Quote className="mt-0.5 h-4 w-4 text-accent" />
              Best for: {tool.bestFor}
            </p>
          </section>

          <section className="mt-12">
            <h2 className="font-serif text-3xl">Key features</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {tool.features.map((feature) => (
                <li
                  key={feature}
                  className="flex gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                  {feature}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-12 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-mint/30 bg-mint/8 p-5">
              <h2 className="font-serif text-2xl">Pros</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6">
                {tool.pros.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-rose/30 bg-rose/8 p-5">
              <h2 className="font-serif text-2xl">Cons</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6">
                {tool.cons.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Minus className="mt-0.5 h-4 w-4 shrink-0 text-rose" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="font-serif text-3xl">Pricing tiers</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {tool.pricingTiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`rounded-2xl border p-5 ${
                    tier.highlighted
                      ? "border-accent bg-accent/10"
                      : "border-line bg-surface"
                  }`}
                >
                  <p className="text-sm text-muted">{tier.name}</p>
                  <p className="mt-1 font-serif text-3xl">
                    {tier.price}
                    <span className="text-base text-muted">{tier.period ?? ""}</span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-muted">
                    {tier.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="font-serif text-3xl">FAQ</h2>
            <div className="mt-5 divide-y divide-line rounded-2xl border border-line">
              {tool.faqs.map((faq) => (
                <details key={faq.question} className="group p-5">
                  <summary className="cursor-pointer list-none font-medium">
                    {faq.question}
                  </summary>
                  <p className="mt-3 text-sm leading-7 text-muted">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          {related.length > 0 ? (
            <section className="mt-12">
              <h2 className="font-serif text-3xl">Related {categoryName} tools</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {related.map((item) => (
                  <ToolCard key={item.slug} tool={item} categories={categories} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
        <StickyCta tool={tool} promos={promoAds} />
      </div>
    </article>
  );
}
