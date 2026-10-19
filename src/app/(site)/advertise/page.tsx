import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Check, Globe2, Layers, ShieldCheck, Sparkles } from "lucide-react";
import { AdvertiseCheckout } from "@/components/advertise/AdvertiseCheckout";
import { SponsoredPrice } from "@/components/advertise/SponsoredPrice";
import { formatUsd } from "@/lib/advertise";
import { countryName } from "@/lib/country";
import { paypalClientId, paypalConfigured } from "@/lib/paypal";
import { getAdvertiseData } from "@/lib/public-data";
import { formatNumber } from "@/lib/utils";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const { placement } = await getAdvertiseData();
  return {
    title: "Advertise on Forge",
    description: `Book the exclusive homepage sponsored placement on Forge AI Directory: ${formatUsd(placement.price)} for ${placement.days} days.`,
  };
}

const GUIDELINES = [
  "The product must be AI-related.",
  "No crypto products or services.",
  "No gambling websites.",
  "No NSFW or adult tools, and no AI girlfriend or AI companion products.",
  "No “uncensored” or unfiltered AI tools.",
];

function steps(days: number) {
  return [
    "Fill in your banner details and pay securely with PayPal.",
    "We review your product against the guidelines, usually within 2 business days.",
    `Once approved, your banner goes live and runs for ${days} days.`,
    "If we reject the booking, we refund the full amount through PayPal.",
  ];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function AdvertisePage() {
  const { stats, availability, placement, renderedAt } = await getAdvertiseData();
  const clientId = paypalConfigured() ? paypalClientId() : "";

  const statCards = [
    { icon: Layers, label: "Published AI tools", value: formatNumber(stats.publishedTools) },
    { icon: Layers, label: "Categories", value: formatNumber(stats.categories) },
    ...(stats.visitors30d > 0
      ? [{ icon: BarChart3, label: "Visitors, last 30 days", value: formatNumber(stats.visitors30d) }]
      : []),
    ...(stats.pageviews30d > 0
      ? [{ icon: BarChart3, label: "Page views, last 30 days", value: formatNumber(stats.pageviews30d) }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <p className="text-xs uppercase tracking-[0.18em] text-accent">Advertise</p>
      <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Advertise on Forge</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Forge is a directory where people come to search, compare, and choose AI tools. Put your
        product in front of them at the moment they are deciding what to use.
      </p>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-muted">Live numbers from our own analytics</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-line bg-surface p-5">
              <card.icon className="h-4 w-4 text-accent" />
              <p className="mt-3 font-serif text-3xl">{card.value}</p>
              <p className="mt-1 text-sm text-muted">{card.label}</p>
            </div>
          ))}
        </div>
        {stats.topCountries.length > 0 ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <Globe2 className="h-4 w-4 text-accent" />
            Top visitor countries (30 days): {stats.topCountries.map(countryName).join(", ")}
          </p>
        ) : null}
      </section>

      <section className="mt-10 grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: Sparkles,
            title: "Clearly labeled",
            body: "Your placement carries a “Sponsored” label and a nofollow sponsored link, so it stays transparent to visitors and search engines.",
          },
          {
            icon: BarChart3,
            title: "Tracked results",
            body: "We count impressions and clicks on your banner for the whole run and share the numbers with you on request.",
          },
          {
            icon: ShieldCheck,
            title: "Brand-safe",
            body: "We do not list adult, NSFW, AI companion, crypto, or gambling products, so your ad never appears next to them.",
          },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-line bg-surface p-5">
            <item.icon className="h-4 w-4 text-accent" />
            <h3 className="mt-3 font-medium">{item.title}</h3>
            <p className="mt-1 text-sm leading-6 text-muted">{item.body}</p>
          </div>
        ))}
      </section>

      <section id="book" className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-accent/40 bg-gradient-to-b from-[#1a1408] to-ink-2 p-6">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
            <Sparkles className="h-3 w-3" /> Exclusive
          </p>
          <h2 className="mt-3 font-serif text-3xl">{placement.name}</h2>
          <SponsoredPrice placement={placement} renderedAt={renderedAt} />
          <ul className="mt-5 space-y-2.5 text-sm">
            {[
              "Sponsored banner directly under the homepage search box, the first thing visitors see",
              "Exclusive: only one advertiser holds this slot at a time",
              "Your headline, short description, and link to your site",
              `Runs ${placement.days} days from the day we approve it`,
              "Impression and click tracking for the full run",
            ].map((line) => (
              <li key={line} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                <span className="text-muted">{line}</span>
              </li>
            ))}
          </ul>
          <p
            className={`mt-6 rounded-xl px-4 py-3 text-sm ${
              availability.available ? "bg-mint/10 text-mint" : "bg-surface text-muted"
            }`}
          >
            {availability.available
              ? "Available now"
              : availability.nextOpening
                ? `Booked. Next opening: ${formatDate(availability.nextOpening)}`
                : "Booked. Check back soon."}
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-ink-2 p-6">
          <h2 className="font-serif text-2xl">Book this placement</h2>
          <p className="mt-1 text-sm text-muted">Pay with PayPal or a card through PayPal checkout.</p>
          <div className="mt-5">
            <AdvertiseCheckout
              clientId={clientId}
              available={availability.available}
              days={placement.days}
            />
          </div>
        </div>
      </section>

      <section className="mt-12 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="font-serif text-2xl">How it works</h2>
          <ol className="mt-4 space-y-3 text-sm text-muted">
            {steps(placement.days).map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                  {index + 1}
                </span>
                <span className="leading-6">{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h2 className="font-serif text-2xl">Advertising guidelines</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            {GUIDELINES.map((rule) => (
              <li key={rule} className="flex gap-2">
                <span className="text-accent">•</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">
            We may edit your headline or description for clarity, and we reserve the right to reject
            non-compliant ads.
          </p>
        </div>
      </section>

      <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
        Just want to be listed? Directory listings are free:{" "}
        <Link href="/submit" className="text-accent hover:underline">
          submit your tool
        </Link>
        .
      </p>
    </div>
  );
}
