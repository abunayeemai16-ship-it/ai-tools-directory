"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  DollarSign,
  Globe,
  MousePointerClick,
  Users,
} from "lucide-react";
import type { AnalyticsOverview } from "@/lib/types";
import { formatCompact, formatCurrency, formatNumber } from "@/lib/utils";

type Range = "daily" | "weekly" | "monthly";

const empty: AnalyticsOverview = {
  liveVisitors: 0,
  clicksToday: 0,
  clicksMonth: 0,
  epc: 0,
  commissionsToday: 0,
  commissionsMonth: 0,
  estimatedRevenueToday: 0,
  estimatedRevenueMonth: 0,
  topCountry: null,
  countries: [],
  traffic: { daily: [], weekly: [], monthly: [] },
};

export function OverviewDashboard({
  initial,
}: {
  initial?: AnalyticsOverview;
}) {
  const [data, setData] = useState<AnalyticsOverview>(initial ?? empty);
  const [range, setRange] = useState<Range>("daily");

  const load = useCallback(async () => {
    const res = await fetch("/api/analytics/overview", { cache: "no-store" });
    if (!res.ok) return;
    setData((await res.json()) as AnalyticsOverview);
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(id);
  }, [load]);

  const series = data.traffic[range];
  const max = Math.max(0, ...series.map((point) => point.value));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Analytics</p>
        <h1 className="mt-1 font-serif text-3xl">Overview</h1>
        <p className="mt-1 text-sm text-muted">
          Live visitors, pageviews, countries, and clicks from persisted records.
          Heartbeats expire after 45 seconds. A new setup starts at 0.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Live visitors"
          value={formatNumber(data.liveVisitors)}
          hint="Sessions active in the last 45 seconds"
          live
        />
        <StatCard
          icon={MousePointerClick}
          label="Affiliate clicks today"
          value={formatNumber(data.clicksToday)}
          hint={`${formatNumber(data.clicksMonth)} this month`}
        />
        <StatCard
          icon={DollarSign}
          label="Est. revenue today"
          value={formatCurrency(data.estimatedRevenueToday)}
          hint={`${formatCurrency(data.estimatedRevenueMonth)} MTD · EPC ${formatCurrency(data.epc)} + commissions`}
        />
        <StatCard
          icon={Globe}
          label="Top country"
          value={data.topCountry?.country ?? "—"}
          hint={
            data.topCountry
              ? `${data.topCountry.share}% of recorded sessions`
              : "No sessions recorded yet"
          }
        />
      </div>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">Visitors</h2>
            <p className="text-sm text-muted">
              Real pageviews · last 14 {range === "daily" ? "days" : range === "weekly" ? "weeks" : "months"}
            </p>
          </div>
          <div className="flex rounded-full border border-line p-1">
            {(["daily", "weekly", "monthly"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRange(item)}
                className={`rounded-full px-3 py-1 text-xs capitalize ${
                  range === item ? "bg-accent text-ink" : "text-muted"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 flex h-52 gap-1.5">
          {series.map((point, index) => {
            const height = max === 0 ? 0 : (point.value / max) * 100;
            return (
              <div key={`${point.label}-${index}`} className="flex min-h-0 flex-1 flex-col">
                <div className="flex min-h-0 flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-linear-to-t from-accent/40 to-accent"
                    style={{ height: `${height}%` }}
                    title={`${point.label}: ${formatNumber(point.value)}`}
                  />
                </div>
                <span className="mt-2 text-center text-[10px] text-muted">
                  {range === "monthly" ? point.label.slice(0, 3) : point.label.split(" ")[1] ?? point.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" />
          <h2 className="font-medium">Top countries</h2>
        </div>
        {data.countries.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            No sessions yet. Open a public page to record your country.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {data.countries.map((country) => (
              <li key={country.code}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>
                    {country.country}{" "}
                    <span className="text-muted">({country.code})</span>
                  </span>
                  <span className="text-muted">
                    {formatCompact(country.visitors)} · {country.share}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-ink">
                  <div
                    className="h-full rounded-full bg-mint"
                    style={{ width: `${Math.min(100, country.share)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  live,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint: string;
  live?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{label}</p>
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <p className="mt-3 flex items-center gap-2 font-serif text-3xl">
        {live ? (
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-mint" />
          </span>
        ) : null}
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}
